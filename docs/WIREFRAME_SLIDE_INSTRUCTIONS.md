# Adding Wireframes / Mock Diagrams to Your PPT Slide

Use one of the options below to add **"Wireframes / Mock diagrams of the proposed solution"** to your hackathon presentation so it fits on a single slide.

---

## Option A: Use the generated wireframe image

1. **Locate the image**  
   - In Cursor: the image was saved as `wireframes-proposed-solution.png` in the project’s `assets` folder (or in `.cursor/projects/.../assets/` if you use that layout).  
   - If you don’t see it, use **Option B** (HTML wireframe) below.

2. **Insert into PowerPoint**  
   - Open your deck: `Prototype Development Submission _ AWS AI for Bharat Hackathon.pptx`  
   - Add a **new slide** (or use an existing one).  
   - Title: **Wireframes / Mock diagrams of the proposed solution**  
   - **Insert → Pictures → This Device** and select `wireframes-proposed-solution.png`.  
   - Resize the image so it fits the content area (leave a small margin). Use **Format → Crop** if needed so it fits in one slide.

3. **Fit on one slide**  
   - Drag corners to scale; keep aspect ratio (lock icon).  
   - Place the image below the title so the full flow (Auth → Home → Scanner → Cart → Chatbot → Payment & Receipt) is visible.

---

## Option B: Screenshot the HTML wireframe (no image file needed)

1. Open **`wireframe-slide.html`** (in this folder) in a browser.  
2. Set the browser window to full screen or zoom so the content fills the window.  
3. Take a **screenshot** (e.g. Win+Shift+S or Snipping Tool) of the wireframe area.  
4. In PowerPoint: **Insert → Pictures → This Device** and insert the screenshot.  
5. Crop/resize so it fits on one slide under the title **Wireframes / Mock diagrams of the proposed solution**.

---

## What the wireframe shows

The diagram shows the **NoQueue Billing** user flow in one view:

| Screen            | Purpose                                      |
|-------------------|-----------------------------------------------|
| **Auth**          | Sign in / select store                        |
| **Home**          | Offers, recommendations, last order          |
| **Scanner**       | Scan product barcode                          |
| **Cart**          | Review cart                                   |
| **Chatbot**       | Ask about offers, aisle, price (voice/text)   |
| **Payment & Receipt** | Pay (UPI/card) → digital receipt         |

Use this slide to quickly show judges the end-to-end journey in a single diagram.
