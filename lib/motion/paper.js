/** A gently folded newspaper descends to cover, then lifts to reveal. */
export const COVER_DURATION = 520;
export const CRUMPLE_DURATION = 840;

// Adjacent triangles share a crease. Their surfaces stay bounded to avoid
// allocating a full-screen graphics layer for every fold.
const MESH = [
  [
    [0, 0],
    [27, 0],
    [51, 0],
    [76, 0],
    [100, 0],
  ],
  [
    [0, 31],
    [23, 36],
    [54, 29],
    [73, 37],
    [100, 31],
  ],
  [
    [0, 70],
    [28, 66],
    [49, 74],
    [78, 65],
    [100, 70],
  ],
  [
    [0, 100],
    [24, 100],
    [52, 100],
    [75, 100],
    [100, 100],
  ],
];

export function createPaper(document) {
  const overlay = document.createElement("div");
  overlay.className = "paper-transition";
  overlay.setAttribute("aria-hidden", "true");
  const sheet = document.createElement("div");
  sheet.className = "paper-transition__sheet";
  const facets = [];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const a = MESH[row][column];
      const b = MESH[row][column + 1];
      const c = MESH[row + 1][column + 1];
      const d = MESH[row + 1][column];
      const triangles =
        (row + column) % 2
          ? [
              [a, b, d],
              [b, c, d],
            ]
          : [
              [a, b, c],
              [a, c, d],
            ];

      triangles.forEach((points, half) => {
        const element = document.createElement("div");
        element.className = "paper-transition__fold";
        const x = points.reduce((sum, point) => sum + point[0], 0) / 3;
        const y = points.reduce((sum, point) => sum + point[1], 0) / 3;
        const left = Math.min(...points.map((point) => point[0]));
        const top = Math.min(...points.map((point) => point[1]));
        const width = Math.max(...points.map((point) => point[0])) - left;
        const height = Math.max(...points.map((point) => point[1])) - top;
        const direction = (row + column + half) % 2 ? 1 : -1;

        element.style.left = `${left}%`;
        element.style.top = `${top}%`;
        element.style.width = `${width + 0.16}%`;
        element.style.height = `${height + 0.16}%`;
        element.style.clipPath = `polygon(${points.map((point) => `${((point[0] - left) / width) * 100}% ${((point[1] - top) / height) * 100}%`).join(",")})`;
        element.style.transformOrigin = `${((x - left) / width) * 100}% ${((y - top) / height) * 100}%`;
        element.style.backgroundPosition = `${-left}vw ${-top}vh`;
        element.style.setProperty(
          "--crease-angle",
          `${24 + column * 42 + row * 17}deg`,
        );
        element.style.setProperty(
          "--crease-strength",
          String(0.05 + ((row + column + half) % 3) * 0.03),
        );
        sheet.append(element);
        facets.push({
          element,
          // Lower folds lift first. Keep the edges close to their original
          // neighbours so the page feels like one softly handled sheet.
          foldX: (50 - x) * 0.012,
          foldY: -y * 0.055,
          tiltX: direction * (6 + row * 4 + half * 3),
          tiltY: -direction * (3 + column * 1.5),
          twist: direction * 0.7,
          depth: 4 + ((row + column + half) % 4) * 3,
        });
      });
    }
  }

  overlay.append(sheet);
  return { overlay, sheet, facets };
}

export function coverPaper({ sheet }) {
  return sheet.animate(
    [
      {
        opacity: 1,
        transform: "translate3d(0,-104%,0)",
      },
      {
        opacity: 1,
        transform: "translate3d(0,0%,0)",
      },
    ],
    {
      duration: COVER_DURATION,
      easing: "cubic-bezier(.45,.02,.22,1)",
      fill: "forwards",
    },
  );
}

export function crumplePaper({ overlay, sheet, facets }) {
  overlay.classList.add("is-folding");
  const folds = facets.map((facet) => {
    const crease = `translate3d(${facet.foldX * 0.45}vw,${facet.foldY * 0.45}vh,${facet.depth * 0.45}px) rotateX(${facet.tiltX * 0.45}deg) rotateY(${facet.tiltY * 0.45}deg) rotateZ(${facet.twist * 0.45}deg)`;
    const folded = `translate3d(${facet.foldX}vw,${facet.foldY}vh,${facet.depth}px) rotateX(${facet.tiltX}deg) rotateY(${facet.tiltY}deg) rotateZ(${facet.twist}deg)`;
    return facet.element.animate(
      [
        {
          transform:
            "translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)",
        },
        { transform: crease, offset: 0.45 },
        { transform: folded, offset: 0.9 },
        { transform: folded },
      ],
      {
        duration: CRUMPLE_DURATION,
        easing: "cubic-bezier(.4,.06,.3,1)",
        fill: "forwards",
      },
    );
  });

  // The bottom edge travels upwards across the viewport. There is no
  // diagonal throw, fading flash or collapse into the centre of the page.
  const gathering = sheet.animate(
    [
      {
        opacity: 1,
        transform: "translate3d(0,0%,0) scaleY(1)",
        offset: 0,
      },
      {
        opacity: 1,
        transform: "translate3d(0,-13%,0) scaleY(.995)",
        offset: 0.25,
      },
      {
        opacity: 1,
        transform: "translate3d(0,-56%,0) scaleY(.975)",
        offset: 0.65,
      },
      {
        opacity: 1,
        transform: "translate3d(0,-104%,0) scaleY(.96)",
        offset: 1,
      },
    ],
    {
      duration: CRUMPLE_DURATION,
      easing: "cubic-bezier(.4,.04,.24,1)",
      fill: "forwards",
    },
  );

  return { folds, gathering };
}
