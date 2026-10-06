# ShiftFlow AI — Operations Shift Handover Assistant

ShiftFlow AI transforms unstructured shift notes into clear, professional, actionable operational shift handovers, continuity tracking, and operational intelligence.

---

## 🚀 Live Hosting on GitHub Pages (Fixing Blank Page)

If you see a blank page at `https://shadlabs.github.io/ShiftFlow-AI/`, it is because GitHub Pages is currently serving the uncompiled root `/` directory instead of the compiled build.

Choose **either** of these two quick ways to fix it:

### Method A (Recommended: 1-Click via `/docs` folder)
1. In your GitHub repository, click **Settings** > **Pages** (in the left sidebar).
2. Under **Build and deployment > Source**, ensure **Deploy from a branch** is selected.
3. Under **Branch**, select `main` (or `master`) and change the folder from `/ (root)` to:
   👉 **`/docs`**
4. Click **Save**.
5. Wait 30 seconds and refresh `https://shadlabs.github.io/ShiftFlow-AI/` — your app will load completely!

### Method B (Via GitHub Actions)
1. In your GitHub repository, click **Settings** > **Pages**.
2. Under **Build and deployment > Source**, click the dropdown and choose:
   👉 **GitHub Actions**
3. Push your latest code. The `.github/workflows/deploy.yml` workflow will automatically build and deploy the production bundle to GitHub Pages.

---

## 🛠 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production (outputs to /dist)
npm run build
```

---

## 🌟 Key Features

- **Operations Dashboard**: Real-time overview of current shift, open issues, critical issues, pending actions, and recent shift logs.
- **Structured Shift Handover**: Form for shift dates, intervals, departments, shift leads, and operational KPI metrics (throughput, backlog, quality, downtime, staffing).
- **Shift Continuity Engine**: Surfaces open/monitored issues from previous shifts under *"Carried Over From Previous Shift"*, allowing incoming teams to update status (*Resolved*, *Still Open*, *Escalated*, *Monitoring*).
- **AI Handover Synthesis**: Categorizes issues (*Equipment*, *Process*, *Quality*, *Staffing*, *Safety*, etc.), assigns severity (*Low*, *Medium*, *High*, *Critical*), and drafts executive summaries.
- **Clarifying Follow-up Questions**: Detects ambiguities or missing data points in shift notes to reduce assumptions before saving.
- **30-Second Management Brief**: One-click high-density brief ready to copy for leadership Slack, Teams, or email dispatch.
- **Operational Action Tracker**: Assign follow-ups with priorities, assignees, and lead approvals.
- **Cross-Shift AI Insights**: Frequency analysis of repeat bottlenecks and empirical operational trends.
- **Print & PDF Layout**: Clean, formal print-friendly stylesheet for shift record filing.
- **Data Persistence**: Stores data in browser storage with 1-click JSON export/backup and demo reset.
