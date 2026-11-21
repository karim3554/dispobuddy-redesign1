# DispoBuddy — Website Redesign Concept & Interactive Demo

An interactive 11-page visual redesign and demo project for **DispoBuddy.com**, built with Vanilla HTML, CSS, JavaScript, Leaflet, and locally hosted GSAP + ScrollTrigger.

> **Demo Notice:** This repository is a visual redesign and interactive demo project, **not** the official live DispoBuddy website. All forms (`submit-deal.html`, `join.html`, and `contact.html`) run in **local preview mode** — they perform client-side validation, conditional logic, local draft storage, and confirmation states, and are **not** connected to a production submission backend.

## Included Pages (11/11)

1. `index.html` — Redesigned Homepage
2. `submit-deal.html` — Interactive 4-Step Deal Submission Wizard (validation, conditional fields, local draft auto-save, review step, local preview confirmation)
3. `what-we-look-for.html` — Deal Criteria & Requirements
4. `process.html` — Disposition Process Breakdown
5. `proof.html` — Closed Deal Structures & Partner Proof
6. `buyers-map.html` — Interactive Leaflet Active Buyers Map (read-only live buyer demand feed with filtering)
7. `faq.html` — Dedicated FAQ Page (6 categories, sticky category navigation, 25 Q&As)
8. `join.html` — Partner Network Onboarding Application (local preview mode)
9. `contact.html` — Contact Page & Inquiry Form (local preview mode)
10. `terms.html` — Terms of Service
11. `privacy.html` — Privacy Policy

## Preserved Brand Identity

- **Logos:** `assets/img/logo-dark.svg` & `assets/img/logo-light.svg`
- **Brand Colors:** Navy `#0D1F3C`, Orange `#F7941D`, Sky Blue `#29ABE2`
- **Typography:** Google Fonts `Poppins`

## How to Run Locally

From the project root directory, choose any of the following options:

### Option 1: Included Node Preview Server (Recommended)
```bash
node server.js
```
Then open: **http://127.0.0.1:4173**

### Option 2: Python HTTP Server
```bash
python -m http.server 4173
```
Then open: **http://127.0.0.1:4173**

### Option 3: Static File Server
```bash
npx serve . -l 4173
```
