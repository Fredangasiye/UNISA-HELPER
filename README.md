# UNISA My Work

Vercel-ready static app + secure UNISA calendar proxy.

## Deploy
1. Create a new Vercel project from this folder.
2. Deploy.
3. The frontend calls `/api/calendar?url=...`.
4. The proxy only allows official `mymodules.dtls.unisa.ac.za` hosts and does not store the calendar URL/token.

## Important
The app is an independent planning tool, not an official UNISA service.
