SELECT setseed(0.42);

WITH ranked AS (
    SELECT s.*,
           ROW_NUMBER() OVER (PARTITION BY s.intensity_bin ORDER BY random()) AS rn
    FROM   songs AS s WHERE lang = 'de'
)
SELECT
    r.id,
    STRING_AGG(a.name, ', ') AS artist,   -- falls es mehrere Artists pro Song gibt
    r.title,
    r.intensity_bin,
    r.lyrics,
    r.mentions,
    r."geniusURL",
    r."releaseDate"

FROM ranked AS r
         JOIN "Artist_Songs" AS asg ON asg."songId" = r.id
         JOIN artists AS a ON a.id = asg."artistId"
WHERE (
          (r.intensity_bin = 'none'   AND r.rn <= 5) OR
          (r.intensity_bin = 'low'    AND r.rn <= 5) OR
          (r.intensity_bin = 'medium' AND r.rn <= 5) OR
          (r.intensity_bin = 'high'   AND r.rn <= 5)
          )
GROUP BY r.id, r.title, r.intensity_bin, r.lyrics, r.mentions, r."geniusURL", r."releaseDate"
ORDER BY r.intensity_bin;