# EmailJS template for the contact form

Everything you need to paste into
[dashboard.emailjs.com/admin/templates](https://dashboard.emailjs.com/admin/templates).

This file is documentation. **Do not upload it to the web host** — it is here
so you are not scrolling back through a chat log in six months.

---

## What the form sends

`contact.html` posts these nine fields. A variable the template does not
reference simply will not appear in the email.

| Variable           | Field                      | Required |
| ------------------ | -------------------------- | -------- |
| `{{name}}`         | Name                       | yes      |
| `{{company}}`      | Brand / Company Name       | yes      |
| `{{email}}`        | Email                      | yes      |
| `{{website}}`      | Website                    | no       |
| `{{project_type}}` | What are you after?        | no\*     |
| `{{budget}}`       | Budget range               | no       |
| `{{timeframe}}`    | Estimated timeframe        | no       |
| `{{referral}}`     | How did you find me?       | no       |
| `{{description}}`  | Tell me about the project  | no       |

\* Not a required *field* in HTML terms, because a checkbox group cannot be
marked `required`. The page refuses to submit without one, in JS.

**There is a tenth field, `url`. Never reference it.** It is the honeypot:
invisible to people, filled in by bots, and anything arriving with it set is
dropped before EmailJS is called. If you put `{{url}}` in the template you
will just be printing a spam signal into your own inbox.

---

## Settings tab

| Setting      | Value                                             |
| ------------ | ------------------------------------------------- |
| To Email     | `hello@doubledashcreative.com`                    |
| From Name    | `Double Dash Creative` *(or `{{name}}`)*          |
| Reply To     | `{{email}}`                                       |
| Subject      | `New enquiry — {{name}} at {{company}}`            |

**Reply To matters most.** Set it to `{{email}}` and hitting reply in your mail
client goes straight back to the person. Leave it blank and you reply to
yourself, which is easy to not notice until you have done it three times.

---

## Content — plain text

Simplest and most reliable. Paste into the template body with the editor set
to plain text.

```
New enquiry from the website.

WHO
  Name       {{name}}
  Company    {{company}}
  Email      {{email}}
  Website    {{website}}

PROJECT
  Wants      {{project_type}}
  Budget     {{budget}}
  Timeframe  {{timeframe}}

  {{description}}

Found me via {{referral}}.
```

---

## Content — HTML

If you would rather it looked like something. Paste into the body with the
editor set to HTML (Code view).

```html
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#15151c;max-width:600px">

  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#FC6935">
    New enquiry
  </p>

  <h1 style="margin:0 0 24px;font-size:22px;font-weight:600">
    {{name}} &mdash; {{company}}
  </h1>

  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
    <tr>
      <td style="padding:8px 16px 8px 0;color:#6a6a7e;white-space:nowrap">Email</td>
      <td style="padding:8px 0"><a href="mailto:{{email}}" style="color:#2E2B8A">{{email}}</a></td>
    </tr>
    <tr>
      <td style="padding:8px 16px 8px 0;color:#6a6a7e;white-space:nowrap">Website</td>
      <td style="padding:8px 0">{{website}}</td>
    </tr>
    <tr>
      <td style="padding:8px 16px 8px 0;color:#6a6a7e;white-space:nowrap">Wants</td>
      <td style="padding:8px 0"><strong>{{project_type}}</strong></td>
    </tr>
    <tr>
      <td style="padding:8px 16px 8px 0;color:#6a6a7e;white-space:nowrap">Budget</td>
      <td style="padding:8px 0">{{budget}}</td>
    </tr>
    <tr>
      <td style="padding:8px 16px 8px 0;color:#6a6a7e;white-space:nowrap">Timeframe</td>
      <td style="padding:8px 0">{{timeframe}}</td>
    </tr>
  </table>

  <div style="margin:24px 0;padding:16px 18px;background:#FFF6F3;border-left:3px solid #FC6935">
    <p style="margin:0;white-space:pre-wrap">{{description}}</p>
  </div>

  <p style="margin:0;font-size:13px;color:#6a6a7e">
    Found you via {{referral}}
  </p>

</div>
```

`white-space:pre-wrap` on the description is deliberate — it keeps the line
breaks someone typed into the textarea instead of running their paragraphs
together.

---

## After saving

1. Copy the **Template ID** from the Settings tab and check it matches what is
   in `contact.html`. Currently `template_dbldash`, alongside
   `service_dbldash`.
2. Submit the real form once and check every one of the nine lines arrives
   filled in.
3. While you are in the dashboard: Account → Security → add
   `https://doubledashcreative.com` to the allowed origins. Without it, anyone
   can read your public key out of the page source and send mail through your
   account from any domain.

---

# Auto-reply

The confirmation the **enquirer** gets. In EmailJS this is not a second
template: open `template_dbldash` and switch to the **Auto-Reply** tab, which
has its own To / From / Subject / Content.

## Settings

| Setting   | Value                                  |
| --------- | -------------------------------------- |
| To Email  | `{{email}}`                            |
| From Name | `Double Dash Creative`                 |
| Reply To  | `hello@doubledashcreative.com`         |
| Subject   | `Thanks for getting in touch, {{name}}` |

Note the To and Reply To are the reverse of the notification template. This
one goes **to** the person and replies come **back** to you.

## Content

```
Hi {{name}},

Thanks for getting in touch about {{project_type}}. This is just to confirm
it landed with me, so you are not left wondering.

I read everything personally and you will hear back from me within two
working days. If it turns out I am not the right fit, I will say so and point
you somewhere better rather than leave you hanging.

Here is what you sent, for your records:

  Company    {{company}}
  Wants      {{project_type}}
  Budget     {{budget}}
  Timeframe  {{timeframe}}

  {{description}}

Speak soon,
Anderson

Double Dash Creative
doubledashcreative.com
```

The two working days matches the standfirst on the contact page. Change one
and change the other, or you are promising two different things in two places.

---

# Two fields your current template is missing

The notification template in the dashboard right now lists seven variables.
The form sends nine. These two are being dropped:

- `{{website}}` — their site, if they have one. Useful context before you reply.
- `{{referral}}` — how they found you. This is your only attribution data, and
  it is the one that tells you whether Instagram, Behance or search is actually
  bringing work in.

Add both and you are capturing everything the form collects.
