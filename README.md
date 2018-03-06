# croc-of

A croc of 💩 that works around current issues with styled-components rendering is production mode.

Enables snapshots to be taken of pages at build time.

Does so by bundling code with parcel, running a dev server, saving the files, then rebuilding all over again in prod mode, cause you know its 2018 and thats the state of the web

## Usage

Just probably dont.

I threw this together with lots of copy pasting and not a care for anything other than the output.

Hopefully will only be using it for a couple weeks...

If you must put a `croc.js` file in your root to match the config and give it some routes.

Then just call `croc`

Each route hit will be saved in all its styled glory in the `dist` folder as `route + '/index.html'`
