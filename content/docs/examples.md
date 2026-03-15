---
title: Chart Examples
description: Live Chart.js examples rendered from embedded JSON data.
order: 9
---

# Chart Examples

These charts are rendered client-side from the JSON data embedded in this Markdown file.

## Bar chart — Quarterly revenue

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "Revenue ($K)",
      "data": [120, 200, 150, 280]
    }]
  },
  "options": {
    "plugins": {
      "title": { "display": true, "text": "Quarterly Revenue" }
    }
  }
}
```

## Line chart — Monthly active users

```chart
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "datasets": [
      {
        "label": "2024",
        "data": [1000, 1500, 1200, 1800, 2400, 2100]
      },
      {
        "label": "2025",
        "data": [1200, 1700, 1600, 2200, 2800, 3100]
      }
    ]
  },
  "options": {
    "plugins": {
      "title": { "display": true, "text": "Monthly Active Users" }
    }
  }
}
```

## Doughnut chart — Traffic sources

```chart
{
  "type": "doughnut",
  "data": {
    "labels": ["Organic", "Direct", "Referral", "Social", "Email"],
    "datasets": [{
      "label": "Traffic Sources",
      "data": [42, 25, 15, 12, 6]
    }]
  },
  "options": {
    "plugins": {
      "title": { "display": true, "text": "Traffic by Source (%)" }
    }
  }
}
```
