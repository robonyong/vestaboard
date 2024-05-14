# vestaboard-settings

Personal vestaboard Installable that shows transit times, google calendar schedule, and a cat incident tracker throughout the day.

## infra
BE is a go api, FE is a nextjs app. both are bundled into a single docker image that is deployed to a raspberry pi that communicates with the vestaboard API. a local cron job triggers a rescan of the latest data every 5 minutes. This docker image used to be deployed to cloud run, but I wanted to pinch a few pennies.
