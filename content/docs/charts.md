---
title: Charts
description: Render interactive charts from embedded JSON data using Chart.js.
order: 8
---

# Charts

mkdnsite renders interactive charts from JSON data embedded in Markdown using [Chart.js](https://www.chartjs.org/).

## Quick start

Wrap a Chart.js configuration object in a `chart` fenced code block:

````markdown
```chart
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "Revenue ($K)",
      "data": [120, 200, 150, 280]
    }]
  }
}
```
````

## Supported chart types

All Chart.js chart types are supported:

| Type | Description |
|------|-------------|
| `bar` | Vertical bar chart |
| `line` | Line chart (smooth curves by default) |
| `pie` | Pie chart |
| `doughnut` | Doughnut chart |
| `radar` | Radar/spider chart |
| `polarArea` | Polar area chart |
| `scatter` | Scatter plot |
| `bubble` | Bubble chart |

## Theme integration

Charts automatically inherit your site's theme colors:

- Text and axis labels use `--mkdn-text-muted`
- Grid lines use `--mkdn-border`
- The first dataset uses `--mkdn-accent`
- Additional datasets use a built-in palette

Charts adapt to light/dark mode automatically.

## Customization

You can pass any valid Chart.js configuration, including custom colors, legends, tooltips, and axis options:

````markdown
```chart
{
  "type": "line",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
    "datasets": [{
      "label": "Users",
      "data": [1000, 1500, 1200, 1800, 2400],
      "borderColor": "#6366f1",
      "backgroundColor": "#6366f133",
      "fill": true
    }]
  },
  "options": {
    "plugins": {
      "title": {
        "display": true,
        "text": "Monthly Active Users"
      }
    }
  }
}
```
````

## AI agent behavior

When an AI agent requests the page as Markdown (`Accept: text/markdown`), it receives the raw JSON data — fully machine-readable. This means AI agents can analyze, transform, or discuss chart data directly from the source.

## Disabling charts

```typescript
// mkdnsite.config.ts
const config = {
  client: {
    charts: false
  }
}
```

Or via CLI:

```bash
mkdnsite --no-charts
```
