#!/bin/sh
set -eu
media="$1"
clip="$media/.clip.webm"
if [ ! -f "$clip" ]; then
    mkdir -p "$media"
    ffmpeg -loglevel error -y -f lavfi -i testsrc2=size=1280x720:rate=24 -f lavfi -i sine=frequency=440 -f lavfi -i sine=frequency=660 -t 30 -map 0:v -map 1:a -map 2:a -metadata:s:a:0 language=eng -metadata:s:a:1 language=nor -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 400k -c:a libopus "$clip"
fi
subtitles() {
    for language in en no; do
        if [ ! -f "$1.$language.srt" ]; then
            printf '1\n00:00:01,000 --> 00:00:05,000\nThe harbor lights are out.\n\n2\n00:00:06,000 --> 00:00:10,000\nThen we sail by the stars.\n' > "$1.$language.srt"
        fi
    done
    return 0
}
scenes="$media/.scenes.webm"
if [ ! -f "$scenes" ]; then
    printf ';FFMETADATA1\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=10000\ntitle=Cold Open\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=10000\nEND=20000\ntitle=The Harbor\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=20000\nEND=30000\ntitle=Last Light\n' > "$media/.scenes.txt"
    ffmpeg -loglevel error -y -i "$clip" -i "$media/.scenes.txt" -map 0 -map_metadata 1 -map_chapters 1 -c copy "$scenes"
fi
episode() {
    case "$1" in
        1:1) echo "The Night Ferry" ;;
        1:2) echo "Low Water" ;;
        1:3) echo "Signal Fires" ;;
        2:1) echo "Breakwater" ;;
        *) echo "Salt and Iron" ;;
    esac
    return 0
}
while IFS='|' read -r kind title year from to genre plot; do
    if [ "$kind" = movie ]; then
        dir="$media/Movies/$title ($year)"
        if [ ! -f "$dir/$title ($year).webm" ]; then
            mkdir -p "$dir"
            cp "$clip" "$dir/$title ($year).webm"
            printf '<movie><title>%s</title><year>%s</year><plot>%s</plot><genre>%s</genre><rating>7.4</rating><mpaa>PG-13</mpaa><director>Alex Moreau</director></movie>\n' "$title" "$year" "$plot" "$genre" > "$dir/movie.nfo"
            sh demo/art.sh "$dir" "$title" "$year" "$from" "$to"
        fi
        subtitles "$dir/$title ($year)"
    else
        dir="$media/Shows/$title"
        if [ ! -f "$dir/Season 02/$title S02E02.webm" ]; then
            mkdir -p "$dir/Season 01" "$dir/Season 02"
            for key in 1:1 1:2 1:3 2:1 2:2; do
                s="${key%:*}"
                e="${key#*:}"
                name="$dir/Season 0$s/$title S0${s}E0$e"
                cp "$scenes" "$name.webm"
                printf '<episodedetails><title>%s</title><season>%s</season><episode>%s</episode><aired>%s-0%s-1%s</aired><plot>The tide turns on %s as old debts surface in the harbor.</plot><director>Lena Hart</director><credits>Owen Price</credits><actor><name>Theo Lind</name><role>Harbor Pilot</role></actor></episodedetails>\n' "$(episode "$key")" "$s" "$e" "$year" "$s" "$e" "$title" > "$name.nfo"
            done
            printf '<tvshow><title>%s</title><year>%s</year><premiered>%s-03-01</premiered><plot>%s</plot><genre>%s</genre><rating>8.1</rating><mpaa>TV-14</mpaa><status>Continuing</status><studio>Northlight</studio><tag>Coastal</tag><uniqueid type="imdb" default="true">tt99%s</uniqueid><uniqueid type="tvdb">99%s</uniqueid><uniqueid type="tmdb">99%s</uniqueid><actor><name>Mara Quinn</name><role>Ilse Varga</role></actor><actor><name>Jonah Reyes</name><role>Teodor Brandt</role></actor><actor><name>Sofia Lund</name><role>Harbor Master Kell</role></actor><actor><name>Elias Ward</name><role>Nils Varga</role></actor></tvshow>\n' "$title" "$year" "$year" "$plot" "$genre" "$year" "$year" "$year" > "$dir/tvshow.nfo"
            if [ ! -f "$dir/poster.jpg" ]; then
                sh demo/art.sh "$dir" "$title" "$year" "$from" "$to"
            fi
        fi
        for key in 1:1 1:2 1:3 2:1 2:2; do
            subtitles "$dir/Season 0${key%:*}/$title S0${key%:*}E0${key#*:}"
        done
    fi
done < demo/catalog.txt
