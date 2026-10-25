# Putting the Reduce Motion button back

The button was taken out of every page's nav on 24 October 2026. Only the
markup went — the CSS, the JavaScript and every check that reads the
setting are all still in place, so restoring it is a paste job.

## What to paste

In each page, inside `<div class="nav-actions">`, above the
`.mobile-menu-toggle` button (there is a comment marking the spot):

```html
<button class="motion-toggle" type="button" data-liquid-hero-toggle aria-pressed="false">
    <span class="motion-toggle__icon" aria-hidden="true"></span>
    <span class="motion-toggle__label">Reduce Motion</span>
</button>
```

The pages that had it: `index.html`, `about.html`, `projects.html`,
`contact.html`, `case-study.html`, `404.html`. Delete the comment that
replaced it while you are there.

## What is still there, untouched

| Where | What |
| --- | --- |
| `css/site.css` | `.motion-toggle`, `.motion-toggle__icon`, `.motion-toggle__label`, the pressed state, and the nav's light/tinted variants |
| `js/site.js` → `initMotionToggle()` | Finds `[data-liquid-hero-toggle]`, flips `liquid-hero-reduced` on `<html>`, saves to `localStorage` under `liquid-hero:reduced`, swaps the label between "Reduce Motion" and "Enable Motion", and re-wires the parallax listeners when motion comes back on |
| `js/site.js` → the liquid-hero block | A second pass over the same buttons, for freezing and unfreezing the gradient canvases |
| Every page `<head>` | The inline script that reads `localStorage` and puts `liquid-hero-reduced` on `<html>` before anything paints |

Because the head script and all the `liquid-hero-reduced` checks are still
live, the *setting* still works with no button present — it simply has no
way to be changed from the page.

## The one thing to know

Anyone who had switched motion **off** before the button was removed still
has `liquid-hero:reduced` set to `'1'` in their browser, and now has no way
to switch it back on. They will see the site with every animation disabled.

To clear it by hand, in the browser console:

```js
localStorage.removeItem('liquid-hero:reduced');
```

To clear it for everybody, drop this in each page's `<head>` for a release,
next to the inline script that reads the key, then take it out again:

```html
<script>try{localStorage.removeItem('liquid-hero:reduced');}catch(e){}</script>
```

The OS-level setting is unaffected either way: anyone with "Reduce motion"
on in their system preferences still gets the still version, through the
`prefers-reduced-motion` media queries, which never depended on the button.

## What the setting actually does

Worth knowing before deciding whether to bring the button back — with
`liquid-hero-reduced` on `<html>`:

- the liquid gradient canvases freeze, and the homepage hero stops shrinking
- the About page's opener plays as a plain stack: no pin, no liquid box, no
  skills sequence, and no blue
- the About Me section loses its two-part pin — picture above, bio below
- the project cards stop stacking and drifting
- the mission line's orange bar and the paragraph reveals do not arm
- the photo stickers hang where they are put, without drifting, turning or
  popping in
