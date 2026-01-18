#!/bin/bash

#pull latest changes from master
cd /home/giraffe/repo/win98_personal_site
git pull

#move the site files to the deployment directory
sudo rm -rf /var/www/html/*
sudo cp -r /home/giraffe/repo/win98_personal_site/public/* /var/www/html/

#restart the API service to pick up any changes
sudo systemctl restart giraffe-net-api.service
