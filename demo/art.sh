#!/bin/sh
set -eu
dir="$1"
title="$2"
year="$3"
from="$4"
to="$5"
font=DejaVu-Sans-Bold
convert -size 600x900 "gradient:$from-$to" \( -size 600x900 plasma:fractal -blur 0x24 -colorspace gray \) -compose softlight -composite -gravity center -font "$font" -fill white -pointsize 64 -size 520x -background none caption:"$title" -compose over -composite -gravity south -pointsize 28 -fill "#ffffffb0" -annotate +0+60 "$year" "$dir/poster.jpg"
convert -size 1920x1080 "gradient:$from-$to" -rotate 90 -resize 1920x1080! \( -size 1920x1080 plasma:fractal -blur 0x60 -colorspace gray \) -compose softlight -composite "$dir/backdrop.jpg"
convert -background none -font "$font" -fill white -pointsize 120 label:"$title" -trim +repage \( +clone -background black -shadow 60x6+0+4 \) +swap -background none -layers merge +repage "$dir/logo.png"
