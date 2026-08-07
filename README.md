# Buddy Finder

Buddy Finder is a Vercel-ready pet adoption search site. Visitors enter a city, state, ZIP code, or use browser geolocation, choose the kind of animal they want, and see currently adoptable pets near them.

## Features

- Dogs / Cats / Other tabs
- Other-animal subtype picker
- City, state, ZIP, or browser geolocation
- Search radius selector
- Live Petfinder adoption listings
- Photos, breed, age, size, gender, location, and distance
- Direct links to adoption listings
- Server-side Petfinder API proxy so the secret stays private

## Required Vercel environment variables

`PETFINDER_API_KEY`

`PETFINDER_API_SECRET`

Add both to the Vercel project and redeploy. The site includes the Petfinder attribution required for API-powered listings.
