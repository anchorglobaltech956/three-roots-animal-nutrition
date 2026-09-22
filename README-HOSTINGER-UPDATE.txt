THREE ROOTS ANIMAL NUTRITION — HOSTINGER UPDATE

This package is based on the supplied Three-Roots-Hostinger-Final (1).zip.

Changes in this update:
1. Customer/quote form now submits automatically to info@threeroots.net.
2. Dealer/feed request form now submits automatically to info@threeroots.net.
3. Visitors no longer need to open their own email app.
4. Added a PHP form handler (submit-inquiry.php) with server-side validation and a hidden spam honeypot.
5. Updated English/Spanish success, sending, and error messages.
6. Merged the previously requested dealer-city improvement: city buttons are generated from the existing dealers/dealers.json data and clicking a city lists all active dealers in that city with name, address, phone, and directions.

HOSTINGER UPLOAD
- Back up public_html first.
- Extract this ZIP directly into public_html.
- The ZIP is already rooted correctly: index.html and submit-inquiry.php are at the ZIP root, and dealers/ is at the ZIP root.
- Choose overwrite/replace when Hostinger asks about existing files.
- Do not extract into a new nested folder.

AFTER UPLOAD, TEST BOTH FORMS
- Submit one customer/quote request.
- Submit one dealer/feed request.
- Confirm both messages arrive at info@threeroots.net.
- Also check the spam/junk folder during the first test.

If the page reports that the message could not be sent, PHP mail() is not enabled/configured for this hosting account and SMTP credentials will need to be connected.


GOOGLE DEALER MAP UPDATE
------------------------
The front-page static city-dot SVG map has been replaced with an interactive Google dealer map. See GOOGLE-MAPS-SETUP.txt. The map requires a Google Maps JavaScript API key plus Geocoding API access.
