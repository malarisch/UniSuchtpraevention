UPDATE songs
SET mentions = COALESCE(sub.countSubstances+sub.countCategories, 0)
    FROM (
         SELECT songs.id AS "songId"
              , COUNT("Substances_Songs"."songId") AS countSubstances
            , COUNT(SCS."songId") AS countCategories
         FROM songs
                  LEFT JOIN "Substances_Songs"
                            ON songs.id = "Substances_Songs"."songId"
                    LEFT JOIN public."SubstanceCat_Songs" SCS on songs.id = SCS."songId"
         GROUP BY songs.id
     ) sub
WHERE songs.id = sub."songId";
--- Update Intensity_bin
UPDATE songs
set intensity_bin = 'none'
WHERE mentions < 1;

UPDATE songs
set intensity_bin = 'low'
WHERE mentions > 1 AND mentions < 4;
UPDATE songs
set intensity_bin = 'medium'
WHERE mentions > 3 AND mentions < 6;
UPDATE songs
set intensity_bin = 'high'
WHERE mentions > 5;

