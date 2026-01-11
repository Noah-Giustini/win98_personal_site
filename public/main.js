function SortByName(a, b){ 
	var aName = a.size;
	var bName = b.size;
	
	return aName < bName;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function toBgClassName(str) {
	var temp = str.replace(/\S/g,'_');
	return "bg-" + temp;
}

$(document).ready(function(){

	icons = $(icons).sort(SortByName);

	for( var i=0; i< icons.length; i++){
		$elem = $(".icon-inner-container ul");
		
		// Skip the one 64px icon
		if( icons[i].size == "64" ){
			continue;
		}
		
		var icon_name = icons[i].name.replace('.png','').replace(/-/g,' ').replace(/_/g,' ');
		var name = toTitleCase( icon_name )
		var img_src = "./images/" + icons[i].name;
		var size_classname = "img" + icons[i].size;
		var img_classname = 'bg-' + icons[i].name.replace('.png','').replace(/_/g,'_').replace(/-/g,'_').toLowerCase();
		var object = '<li class="icon-item"><span class="helper"></span><a href="{{href}}" target="_blank"><div class="{{img-class}} {{size-class}}" title="{{img-title}}"></div></a></li>'
		.replace("{{href}}", img_src)
		.replace("{{img-src}}", img_src )
		.replace("{{img-class}}", img_classname )
		.replace("{{size-class}}", size_classname )
		.replace("{{img-title}}", name );

		$elem.append(object);
	}
});