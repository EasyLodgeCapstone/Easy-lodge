# Easy-lodge- Hackathon Project

Welcome!  
This guide explains how to contribute to our project.  
Even if this is your first time using GitHub, you can follow along easily.

## important database notes
* **To Generate migration files**
```
npx drizzle-kit generate
```

* **To Apply migrations to database**
```
npx drizzle-kit migrate
```



## Docs related to this project, contains info for frontend to view. click link to view them

| Section | Link |
|--------|------|
| AdminRoute | [Open](./docs/AdminRoute.md) |
| Authtication Route | [Open](./docs/Authenticationroute.md) |
| Account Deletion flow | [Open](./docs/deletionLifecycle.md) |
| Request And services flow and associated routes | [Open](./docs/RequestsAndServices.md) |
| User profile Route | [Open](./docs/userProfile.md) |


**Contributing info below**
---

## 1️⃣ Clone the Repository

1. On our GitHub repo page, click the green **"Code"** button.
2. Copy the HTTPS link (example: `https://github.com/Ezeh0415/Easy-lodge.git`).
3. Open your terminal/command prompt and run:

````bash
git clone https://github.com/Ezeh0415/Easy-lodge.git
cd certificate-verification-system
````

---

## 2️⃣ Create or Switch to Your Branch

**"DO NOT"** work directly on the `main` branch by all means!!!

Branch naming rules:

`yourname-be` (example: `ade-be`)

To create a new branch:

```bash
git checkout -b yourname-[be]
```

If your branch already exists:

```bash
git checkout yourname-[be]
```

---

## 3️⃣ Keep Your Branch Updated

Before you start working **every time**:

```bash
git pull origin main
git merge main
```

This ensures you’re working with the latest code.

---

## 4️⃣ Make Your Changes

1. Open the project in VS Code:

   ```bash
   code .
   ```

2. Add or edit files for your assigned task.

3. Save your changes.

---

## 5️⃣ Commit Your Changes

```bash
git add .
git commit -m "Brief description of your changes"
```

Example:

```bash
git commit -m "Added login page UI"
```

---

## 6️⃣ Push to GitHub

```bash
git push origin yourname-[be]
```

---

## 7️⃣ Create a Pull Request (PR)

1. Go to the GitHub repository in your browser.
2. Click **"Compare & pull request"**.
3. Make sure:

   * **Base branch**: `main`
   * **Compare branch**: your branch (e.g., `ade-be`)
4. Describe your changes.
5. Click **"Create Pull Request"**.

---

## 8️⃣ Review Process
* **Backend Lead** reviews backend PRs.
* He may:

  * Approve and merge your code into `main`.
  * Request changes for you to fix.

---

## ✅ Rules

* **Never** push directly to `main`.
* Always pull latest changes before starting work especially when there are changes to the main branch.
* Use clear, short commit messages.
* Test your code before pushing.
* Ask if you’re unsure — we’re here to help.

---

## 🔄 Example Workflow 

```bash
git clone https://github.com/Ezeh0415/Easy-lodge.git
cd e-commerce
git checkout main
git pull origin main
git checkout -b ade-be
git merge main
code .
# make changes in VS Code
git add .
git commit -m "Added google Oauth"
git push origin ade-be
# create PR to main on GitHub
```

---

## 📌 Simple Workflow Diagram

```
         ┌─────────────┐
         │     Main    │
         │ (Production)│
         └──────┬──────┘
                │
                ┼
                │                     
          ┌──────────────┐
          │ yourname-be  │
          │ (Backend)    │
          └──────┬───────┘
                 │
             PR to Main 
           (Reviewed first)
```

---

🎯 **That’s it!** Follow these steps for smooth contributions.
Welcome to the team! 🚀
