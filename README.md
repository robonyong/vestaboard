# vestaboard-settings

Personal vestaboard Installable that shows transit times, google calendar schedule, and a cat incident tracker throughout the day.

## infra
These are glued together with two google cloud runs: a go app (cos I need the practice) to interact with the board & a nextjs app to make manual input changes for the go app to read.
The go app is triggered throughout the day by two cloud schedulers, one every 2 minutes during a transit-reporting window & one every 10 minutes the rest of the day.
