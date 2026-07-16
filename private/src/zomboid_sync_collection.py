#!/usr/bin/env python3
import argparse
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import List, Set, Tuple

STEAM_COLLECTION_API = "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/"


def get_collection_item_ids(collection_id: str) -> List[str]:
    body = urllib.parse.urlencode(
        {
            "collectioncount": "1",
            "publishedfileids[0]": collection_id,
        }
    ).encode()
    req = urllib.request.Request(
        STEAM_COLLECTION_API,
        data=body,
        headers={"User-Agent": "Mozilla/5.0"},
    )

    with urllib.request.urlopen(req, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8", "ignore"))

    details = payload.get("response", {}).get("collectiondetails", [])
    if not details:
        raise RuntimeError("Steam API did not return collection details")

    children = details[0].get("children", [])
    ids = sorted({str(child.get("publishedfileid")) for child in children if child.get("publishedfileid")})
    if not ids:
        raise RuntimeError("No workshop items found in collection")

    return ids


def parse_mod_ids_and_maps(workshop_root: Path, workshop_ids: List[str]) -> Tuple[List[str], List[str]]:
    mod_ids: Set[str] = set()
    map_names: Set[str] = set()

    for workshop_id in workshop_ids:
        workshop_item = workshop_root / workshop_id
        if not workshop_item.exists():
            continue

        mods_dir = workshop_item / "mods"
        if not mods_dir.exists():
            continue

        for mod_folder in mods_dir.iterdir():
            if not mod_folder.is_dir():
                continue

            mod_info = mod_folder / "mod.info"
            if mod_info.exists():
                text = mod_info.read_text(encoding="utf-8", errors="ignore")
                for match in re.findall(r"^id\s*=\s*(.+)$", text, flags=re.MULTILINE):
                    mod_id = match.strip()
                    if mod_id:
                        mod_ids.add(mod_id)

            maps_dir = mod_folder / "media" / "maps"
            if maps_dir.exists():
                for map_dir in maps_dir.iterdir():
                    if map_dir.is_dir() and (map_dir / "objects.lua").exists():
                        map_names.add(map_dir.name)

    return sorted(mod_ids), sorted(map_names)


def update_ini_key(lines: List[str], key: str, value: str) -> List[str]:
    prefix = f"{key}="
    replaced = False
    out: List[str] = []

    for line in lines:
        if line.startswith(prefix):
            out.append(f"{prefix}{value}")
            replaced = True
        else:
            out.append(line)

    if not replaced:
        out.append(f"{prefix}{value}")

    return out


def read_ini_key(lines: List[str], key: str, default_value: str = "") -> str:
    prefix = f"{key}="
    for line in lines:
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    return default_value


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync a Project Zomboid Steam collection to servertest.ini")
    parser.add_argument("--collection-id", default="3178279542", help="Steam collection ID")
    parser.add_argument("--server-ini", default="/home/zomboid/Zomboid/Server/servertest.ini")
    parser.add_argument("--workshop-root", default="/opt/pzserver/steamapps/workshop/content/108600")
    args = parser.parse_args()

    server_ini = Path(args.server_ini)
    if not server_ini.exists():
        raise SystemExit(f"Server ini not found: {server_ini}")

    workshop_root = Path(args.workshop_root)
    if not workshop_root.exists():
        fallback_root = Path("/home/zomboid/.steam/SteamApps/workshop/content/108600")
        if fallback_root.exists():
            workshop_root = fallback_root

    workshop_ids = get_collection_item_ids(args.collection_id)
    mod_ids, map_names = parse_mod_ids_and_maps(workshop_root, workshop_ids)

    lines = server_ini.read_text(encoding="utf-8", errors="ignore").splitlines()
    current_map = read_ini_key(lines, "Map", "Muldraugh, KY")
    map_parts = [m.strip() for m in current_map.split(";") if m.strip()]
    if not map_parts:
        map_parts = ["Muldraugh, KY"]

    # Preserve base map first, append workshop map folders after it.
    base_map = map_parts[0]
    full_map_list = [base_map]
    for map_name in map_names:
        if map_name not in full_map_list:
            full_map_list.append(map_name)

    lines = update_ini_key(lines, "WorkshopItems", ";".join(workshop_ids))
    if mod_ids:
        lines = update_ini_key(lines, "Mods", ";".join(mod_ids))
    lines = update_ini_key(lines, "Map", ";".join(full_map_list))

    backup_path = server_ini.with_suffix(f".ini.bak-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    server_ini.replace(backup_path)
    server_ini.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Collection ID: {args.collection_id}")
    print(f"Workshop items: {len(workshop_ids)}")
    print(f"Mod IDs found locally: {len(mod_ids)}")
    print(f"Map folders found locally: {len(map_names)}")
    print(f"Wrote updated config: {server_ini}")
    print(f"Backup created: {backup_path}")

    if not mod_ids:
        print("WARNING: No local mod IDs were found. Run mod download/update first, then rerun this script.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
