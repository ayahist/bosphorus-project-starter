/* =========================================
   SHIP ILLUSTRATION SCROLLYTELLING
   ========================================= */

const shipSteps = document.querySelectorAll(".step");
const shipImage = document.querySelector("#ship-image");
const shipYear = document.querySelector("#ship-year");
const shipStat = document.querySelector("#ship-stat");

function updateShipGraphic(step) {
  const nextImage = step.dataset.image;
  const nextYear = step.dataset.year;
  const nextStat = step.dataset.stat;

  if (!shipImage || !shipYear || !shipStat) {
    return;
  }

  if (shipImage.getAttribute("src") === nextImage) {
    shipYear.textContent = nextYear;
    shipStat.textContent = nextStat;
    return;
  }

  shipImage.classList.add("is-changing");

  window.setTimeout(() => {
    shipImage.src = nextImage;
    shipYear.textContent = nextYear;
    shipStat.textContent = nextStat;
    shipImage.classList.remove("is-changing");
  }, 220);
}

const shipObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      shipSteps.forEach((step) => {
        step.classList.remove("is-active");
      });

      entry.target.classList.add("is-active");
      updateShipGraphic(entry.target);
    });
  },
  {
    threshold: 0.6
  }
);

shipSteps.forEach((step) => {
  shipObserver.observe(step);
});

/* =========================================
   CHANGING LINE CHART
   ========================================= */

const chartSvg = document.querySelector("#changing-chart");
const chartTitle = document.querySelector("#chart-title");
const chartSubtitle = document.querySelector("#chart-subtitle");
const chartMetricLabel = document.querySelector("#chart-metric-label");
const dataSteps = document.querySelectorAll(".data-step");

const metricSettings = {
  vessels: {
    label: "VESSEL COUNT",

    format: (value) => {
      return Math.round(value).toLocaleString("en-US");
    }
  },

  gross_tonnage: {
    label: "TOTAL GROSS TONNAGE",

    format: (value) => {
      return `${Math.round(value / 1000000).toLocaleString(
        "en-US"
      )} million`;
    }
  },

  avg_gt_per_vessel: {
    label: "AVERAGE TONNAGE PER VESSEL",

    format: (value) => {
      return Math.round(value).toLocaleString("en-US");
    }
  }
};

let yearlyData = [];
let currentMetric = "vessels";
let currentIndexedData = [];
let chartAnimationFrame = null;

/* =========================================
   CSV PARSING
   ========================================= */

function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};

    headers.forEach((header, index) => {
      const rawValue = values[index]?.trim();
      const numericValue = Number(rawValue);

      row[header] = Number.isNaN(numericValue)
        ? rawValue
        : numericValue;
    });

    return row;
  });
}

/* =========================================
   SVG HELPERS
   ========================================= */

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

function calculateIndexedData(metric) {
  const firstValue = yearlyData[0][metric];

  return yearlyData.map((row) => {
    return {
      year: row.year,
      rawValue: row[metric],
      indexedValue: (row[metric] / firstValue) * 100
    };
  });
}

function getChartDimensions() {
  const width = chartSvg.clientWidth || 900;
  const height = chartSvg.clientHeight || 500;

  const margin = {
    top: 24,
    right: 135,
    bottom: 50,
    left: 55
  };

  return {
    width,
    height,
    margin,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom
  };
}

function easeInOutCubic(progress) {
  if (progress < 0.5) {
    return 4 * progress * progress * progress;
  }

  return 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/* =========================================
   CHART DRAWING
   ========================================= */

function drawChart(indexedData, metric, animateLine = true) {
  if (!yearlyData.length || !chartSvg) {
    return;
  }

  chartSvg.innerHTML = "";

  const settings = metricSettings[metric];

  const {
    width,
    height,
    margin,
    innerWidth,
    innerHeight
  } = getChartDimensions();

  chartSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const minYear = indexedData[0].year;
  const maxYear = indexedData[indexedData.length - 1].year;

  const minimumIndex = 65;
  const maximumIndex = 190;

  const xScale = (year) => {
    return (
      margin.left +
      ((year - minYear) / (maxYear - minYear)) * innerWidth
    );
  };

  const yScale = (value) => {
    return (
      margin.top +
      ((maximumIndex - value) /
        (maximumIndex - minimumIndex)) *
        innerHeight
    );
  };

  const chartGroup = createSvgElement("g");

  chartSvg.appendChild(chartGroup);

  const yTicks = [75, 100, 125, 150, 175];

  yTicks.forEach((tick) => {
    const y = yScale(tick);

    const gridline = createSvgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: y,
      y2: y,
      class: "chart-axis"
    });

    const tickLabel = createSvgElement("text", {
      x: margin.left - 12,
      y: y + 4,
      "text-anchor": "end",
      class: "chart-index-label"
    });

    tickLabel.textContent = tick;

    chartGroup.appendChild(gridline);
    chartGroup.appendChild(tickLabel);
  });

  const baseline = createSvgElement("line", {
    x1: margin.left,
    x2: width - margin.right,
    y1: yScale(100),
    y2: yScale(100),
    class: "chart-baseline"
  });

  chartGroup.appendChild(baseline);

  const linePoints = indexedData
    .map((row) => {
      return `${xScale(row.year)},${yScale(row.indexedValue)}`;
    })
    .join(" ");

  const areaPoints = [
    `${xScale(indexedData[0].year)},${yScale(100)}`,

    ...indexedData.map((row) => {
      return `${xScale(row.year)},${yScale(row.indexedValue)}`;
    }),

    `${xScale(
      indexedData[indexedData.length - 1].year
    )},${yScale(100)}`
  ].join(" ");

  const area = createSvgElement("polygon", {
    points: areaPoints,
    class: "chart-area"
  });

  chartGroup.appendChild(area);

  const line = createSvgElement("polyline", {
    points: linePoints,
    class: "chart-line",
    pathLength: 1
  });

  chartGroup.appendChild(line);

  if (animateLine) {
    line.style.strokeDasharray = "1";
    line.style.strokeDashoffset = "1";
    line.style.transition =
      "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)";

    requestAnimationFrame(() => {
      line.style.strokeDashoffset = "0";
    });
  }

  const firstPoint = indexedData[0];
  const lastPoint = indexedData[indexedData.length - 1];

  const firstDot = createSvgElement("circle", {
    cx: xScale(firstPoint.year),
    cy: yScale(firstPoint.indexedValue),
    r: 7,
    class: "chart-dot"
  });

  const lastDot = createSvgElement("circle", {
    cx: xScale(lastPoint.year),
    cy: yScale(lastPoint.indexedValue),
    r: 7,
    class: "chart-dot"
  });

  chartGroup.appendChild(firstDot);
  chartGroup.appendChild(lastDot);

  const labelGroup = createSvgElement("g", {
    class: "chart-label-group"
  });

  const firstYearLabel = createSvgElement("text", {
    x: xScale(firstPoint.year),
    y: height - 16,
    "text-anchor": "middle",
    class: "chart-year-label"
  });

  firstYearLabel.textContent = firstPoint.year;

  const lastYearLabel = createSvgElement("text", {
    x: xScale(lastPoint.year),
    y: height - 16,
    "text-anchor": "middle",
    class: "chart-year-label"
  });

  lastYearLabel.textContent = lastPoint.year;

  const firstValueLabel = createSvgElement("text", {
    x: xScale(firstPoint.year) + 14,
    y: yScale(firstPoint.indexedValue) - 20,
    "text-anchor": "start",
    class: "chart-value-label"
  });

  firstValueLabel.textContent = settings.format(
    firstPoint.rawValue
  );

  const lastValueLabel = createSvgElement("text", {
    x: xScale(lastPoint.year) - 14,
    y: yScale(lastPoint.indexedValue) - 20,
    "text-anchor": "end",
    class: "chart-value-label"
  });

  lastValueLabel.textContent = settings.format(
    lastPoint.rawValue
  );

  labelGroup.appendChild(firstYearLabel);
  labelGroup.appendChild(lastYearLabel);
  labelGroup.appendChild(firstValueLabel);
  labelGroup.appendChild(lastValueLabel);

  chartGroup.appendChild(labelGroup);
}

/* =========================================
   MORPH BETWEEN METRICS
   ========================================= */

function animateChartToMetric(metric) {
  const newData = calculateIndexedData(metric);

  if (!currentIndexedData.length) {
    currentIndexedData = newData;
    drawChart(newData, metric, true);
    currentMetric = metric;
    return;
  }

  if (chartAnimationFrame) {
    cancelAnimationFrame(chartAnimationFrame);
  }

  const startData = currentIndexedData.map((row) => ({
    ...row
  }));

  const duration = 700;
  const startTime = performance.now();

  function animateFrame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    const interpolatedData = newData.map((row, index) => {
      const startValue =
        startData[index]?.indexedValue ?? 100;

      return {
        year: row.year,
        rawValue: row.rawValue,

        indexedValue:
          startValue +
          (row.indexedValue - startValue) *
            easedProgress
      };
    });

    drawChart(interpolatedData, metric, false);

    if (progress < 1) {
      chartAnimationFrame =
        requestAnimationFrame(animateFrame);
    } else {
      currentIndexedData = newData;
      currentMetric = metric;

      drawChart(newData, metric, true);
    }
  }

  chartAnimationFrame =
    requestAnimationFrame(animateFrame);
}

/* =========================================
   NUMBER COUNT-UP
   ========================================= */

function animateStatNumber(step) {
  const statElement = step.querySelector(".data-step__stat");

  if (!statElement) {
    return;
  }

  const targetValue = Number(step.dataset.change);
  const duration = 650;
  const startTime = performance.now();

  function animateNumber(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);

    const currentValue = targetValue * easedProgress;
    const sign = targetValue > 0 ? "+" : "−";

    statElement.textContent =
      `${sign}${Math.abs(currentValue).toFixed(1)}%`;

    if (progress < 1) {
      requestAnimationFrame(animateNumber);
    } else {
      statElement.textContent =
        `${sign}${Math.abs(targetValue).toFixed(1)}%`;
    }
  }

  requestAnimationFrame(animateNumber);
}

/* =========================================
   STEP ACTIVATION
   ========================================= */

function activateDataStep(step) {
  dataSteps.forEach((item) => {
    item.classList.remove("is-active");
  });

  step.classList.add("is-active");

  chartTitle.textContent = step.dataset.title;
  chartSubtitle.textContent = step.dataset.subtitle;
  chartMetricLabel.textContent = step.dataset.label;

  animateChartToMetric(step.dataset.metric);
  animateStatNumber(step);
}

const dataObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      activateDataStep(entry.target);
    });
  },
  {
    threshold: 0.58
  }
);

dataSteps.forEach((step) => {
  dataObserver.observe(step);
});

/* =========================================
   LOAD DATA
   ========================================= */

fetch("data/bosphorus_yearly_clean.csv")
  .then((response) => {
    if (!response.ok) {
      throw new Error(
        "The yearly CSV could not be loaded."
      );
    }

    return response.text();
  })
  .then((csvText) => {
    yearlyData = parseCsv(csvText);

    currentIndexedData =
      calculateIndexedData(currentMetric);

    drawChart(
      currentIndexedData,
      currentMetric,
      true
    );
  })
  .catch((error) => {
    console.error(error);

    if (chartSubtitle) {
      chartSubtitle.textContent =
        "The chart data could not be loaded. Check that the CSV is inside the data folder.";
    }
  });

/* =========================================
   RESPONSIVE REDRAW
   ========================================= */

let resizeTimer;

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);

  resizeTimer = window.setTimeout(() => {
    if (!yearlyData.length) {
      return;
    }

    currentIndexedData =
      calculateIndexedData(currentMetric);

    drawChart(
      currentIndexedData,
      currentMetric,
      false
    );
  }, 150);
});

/* =========================================
   SECTION REVEALS
   ========================================= */

const revealSections =
  document.querySelectorAll(".reveal-section");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18
  }
);

revealSections.forEach((section) => {
  revealObserver.observe(section);
});