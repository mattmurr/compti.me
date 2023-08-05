---
title: Simple password-store MacOS workflow
description: Integrate password-store with MacOS with fzf-passmenu
date: 2021-12-01
---

Before I switched to 1Pass on Mac, I used
[`pass`](https://www.passwordstore.org/), and this simple shell script (in place
of [`passmenu`](https://git.zx2c4.com/password-store/tree/contrib/dmenu) because
dmenu depends on X,) that searches `.gpg` files in `~/.password-store` or
`PASSWORD_STORE_DIR` (if set) and pipes into
[`fzf`](https://https://github.com/junegunn/fzf):

```bash
#!/usr/bin/env bash

pushd "${PASSWORD_STORE_DIR:-$HOME/.password-store}"
PASSFILE=`fd -t file -e gpg --color=always | sed 's/\.gpg//; s/^\.\///' | fzf --ansi`
popd

[ -z "$PASSFILE" ] && exit 0

pass -c $PASSFILE 1>/dev/null
```

[iCanHazShortcut](https://github.com/deseven/iCanHazShortcut) allowed me to map
shortcuts to my script. <kbd>Command</kbd> + <kbd>P</kbd> would execute
`alacritty -e sh -c '~/bin/fzf-passmenu'`, spawning a new terminal window and
executing the script. Quick and easy password workflow.

**Edit:** I now use a Bitwarden family setup.
