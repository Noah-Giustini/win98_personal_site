#!/bin/bash

#pull latest changes from master
cd /home/giraffe/repos/win98_personal_site
git pull

#move the site files to the deployment directory
rm -rf /var/www/html/*
cp -r /home/giraffe/repos/win98_personal_site/public/* /var/www/html/

#restart the API service to pick up any changes
sudo systemctl restart giraffe-net-api.service
