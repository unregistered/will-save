# Will Save

Stop losing hours on time-sucking websites before you doing your basic language review.
Will Save is a browser extension (Chrome, Safair, Firefox) which lets you reclaim your
time. Do reviews on Duolingo to earn potions which grant you precious time on sites
you've restricted.

Install: https://unregistered.github.io/will-save/

## Building

Install requirements:

* yarn (I use 1.3.2)

Run `yarn install`

Then to build a dev build:

    yarn gulp watch-firefox

Or

    yarn gulp watch-chrome

## Releasing

    gulp clean dist

Which produces chrome/firefox extension folders.

For submission to mozilla AMO, select all files in the firefox folder and zip them.

## Credits

Original gulpfile/project structure: Copyright (MIT) info@likastore.com https://github.com/likeastore/browser-extension

Icons: AhNinniah https://www.gamedevmarket.net/member/ahninniah/
