#!/bin/sh
set -eu
media="$1"
clip="$media/.clip.webm"
if [ ! -f "$clip" ]; then
    mkdir -p "$media"
    ffmpeg -loglevel error -y -f lavfi -i testsrc2=size=1280x720:rate=24 -f lavfi -i sine=frequency=440 -t 30 -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 400k -c:a libopus "$clip"
fi
while IFS='|' read -r kind title year from to genre plot; do
    if [ "$kind" = movie ]; then
        dir="$media/Movies/$title ($year)"
        if [ ! -f "$dir/$title ($year).webm" ]; then
            mkdir -p "$dir"
            cp "$clip" "$dir/$title ($year).webm"
            printf '<movie><title>%s</title><year>%s</year><plot>%s</plot><genre>%s</genre><rating>7.4</rating><mpaa>PG-13</mpaa><director>Alex Moreau</director></movie>\n' "$title" "$year" "$plot" "$genre" > "$dir/movie.nfo"
            sh demo/art.sh "$dir" "$title" "$year" "$from" "$to"
        fi
    else
        dir="$media/Shows/$title"
        if [ ! -f "$dir/tvshow.nfo" ]; then
            mkdir -p "$dir/Season 01"
            for n in 1 2 3; do
                cp "$clip" "$dir/Season 01/$title S01E0$n.webm"
            done
            printf '<tvshow><title>%s</title><year>%s</year><plot>%s</plot><genre>%s</genre><rating>8.1</rating></tvshow>\n' "$title" "$year" "$plot" "$genre" > "$dir/tvshow.nfo"
            sh demo/art.sh "$dir" "$title" "$year" "$from" "$to"
        fi
    fi
done < demo/catalog.txt
