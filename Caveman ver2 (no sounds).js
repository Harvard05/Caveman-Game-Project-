// The Game Project (p5.js)

// -------- Globals --------
var floorPos_y;
var worldWidth;

var gameChar_x;
var gameChar_y;
var gameChar_vy = 0; // vertical velocity
var gravity = 1;   // lowered gravity for slower fall and longer jump
var jumpStrength = 18; // lowered jump height

// Scenery
var canyons;
var collectibles;
var trees_x;
var clouds;
var dinosaurs;
var dinosaurColors;
var fireballs;
var volcanoes;
var platforms; // <-- platforms container

// Campfire
var campfire;

// Character interaction
var isLeft;
var isRight;
var isFalling;
var isPlummeting;
var isDead;
var gameWon = false;

// Game stats
var lives = 3;
var score = 0;
var isInvulnerable = false;
var invulnerableTimer = 0;
var invulnerableDuration = 60; // frames (~1 sec at 60fps)

// -------- Helpers --------
function xInCanyon(x) {
  for (let c of canyons) {
    if (x > c.x_pos && x < c.x_pos + c.width) return c;
  }
  return null;
}

function nearestCanyonBounds(x) {
  let leftEdge = -Infinity;
  let rightEdge = Infinity;
  for (let c of canyons) {
    let cRight = c.x_pos + c.width;
    if (cRight <= x && cRight > leftEdge) leftEdge = cRight;
    if (c.x_pos >= x && c.x_pos < rightEdge) rightEdge = c.x_pos;
  }
  if (leftEdge === -Infinity) leftEdge = x - 200;
  if (rightEdge === Infinity) rightEdge = x + 200;
  return { leftLimit: leftEdge + 6, rightLimit: rightEdge - 6 };
}

function checkDinosaurCollisionAny() {
  for (let d of dinosaurs) {
    let dDist = dist(gameChar_x, gameChar_y, d.pos_x, d.pos_y);
    if (dDist < d.size * 0.45) return true;
  }
  return false;
}

// ✅ helper to check if standing on a platform
function isOnPlatform() {
  for (let p of platforms) {
    if (
      gameChar_x > p.x - 10 &&
      gameChar_x < p.x + p.w + 10 &&
      abs(gameChar_y - p.y) < 5
    ) {
      return true;
    }
  }
  return false;
}

// -------- Setup --------
function setup() {
  createCanvas(1024, 576);
  floorPos_y = 432;
  worldWidth = width * 10;

  gameChar_x = width / 2;
  gameChar_y = floorPos_y;

  // --- Canyons ---
  canyons = [];
  let lastCanyonX = 400;
  for (let i = 0; i < 20; i++) {
    let gap = random(300, 600);
    let canyonWidth = random(80, 150);
    canyons.push({ x_pos: lastCanyonX + gap, width: canyonWidth, y_pos: floorPos_y });
    lastCanyonX += gap + canyonWidth;
  }
  lastCanyonX = -200;
  for (let i = 0; i < 20; i++) {
    let gap = random(300, 600);
    let canyonWidth = random(80, 150);
    canyons.push({ x_pos: lastCanyonX - gap - canyonWidth, width: canyonWidth, y_pos: floorPos_y });
    lastCanyonX -= (gap + canyonWidth);
  }

  // --- Trees ---
  trees_x = [];
  for (let i = 0; i < 60; i++) {
    let tree_x, over;
    do {
      over = false;
      tree_x = random(-worldWidth / 2, worldWidth / 2);
      if (xInCanyon(tree_x)) over = true;
    } while (over);
    trees_x.push({ pos_x: tree_x, pos_y: floorPos_y - 50 });
  }

  // --- Volcanoes ---
  volcanoes = [];
  for (let i = 0; i < 20; i++) {
    let volcano_x, over;
    const volcanoWidth = random(120, 300);
    do {
      over = false;
      volcano_x = random(-worldWidth / 2, worldWidth / 2);
      for (let c of canyons) {
        if (volcano_x + volcanoWidth / 2 > c.x_pos && volcano_x - volcanoWidth / 2 < c.x_pos + c.width) {
          over = true;
          break;
        }
      }
    } while (over);
    const volcanoHeight = random(180, 420);
    volcanoes.push({
      pos_x: volcano_x,
      pos_y: floorPos_y - (volcanoHeight / 2),
      height: volcanoHeight,
      width: volcanoWidth
    });
  }

  // --- Clouds ---
  clouds = [];
  for (let i = 0; i < 50; i++) {
    clouds.push({
      pos_x: random(-worldWidth / 2, worldWidth / 2),
      pos_y: random(20, 250),
      size: random(50, 90)
    });
  }

  // --- Dinosaurs ---
  dinosaurColors = [
    [70, 100, 70], [100, 70, 70], [70, 70, 100], [120, 90, 50], [60, 80, 60]
  ];
  dinosaurs = [];

  // Build ground segments between canyons
  let segments = [];
  let sortedCanyons = [...canyons].sort((a, b) => a.x_pos - b.x_pos);
  let leftEdge = -worldWidth / 2;
  for (let i = 0; i <= sortedCanyons.length; i++) {
    let rightEdge = (i < sortedCanyons.length) ? sortedCanyons[i].x_pos : worldWidth / 2;
    segments.push({ left: leftEdge, right: rightEdge, count: 0 });
    if (i < sortedCanyons.length) leftEdge = sortedCanyons[i].x_pos + sortedCanyons[i].width;
  }

  let maxDinosaurs = 14;
  let placed = 0;
  while (placed < maxDinosaurs) {
    let dX, over, segIdx;
    do {
      over = false;
      dX = random(-worldWidth / 2, worldWidth / 2);
      if (xInCanyon(dX)) over = true;
      segIdx = segments.findIndex(seg => dX >= seg.left && dX < seg.right);
      if (segIdx === -1 || segments[segIdx].count >= 2) over = true;
    } while (over);

    const bounds = nearestCanyonBounds(dX);
    dX = constrain(dX, bounds.leftLimit + 5, bounds.rightLimit - 5);

    dinosaurs.push({
      pos_x: dX,
      pos_y: floorPos_y - 20,
      size: random(70, 130),
      speed: random(0.8, 2.5),
      color: random(dinosaurColors),
      direction: random([1, -1]),
      leftLimit: bounds.leftLimit,
      rightLimit: bounds.rightLimit
    });
    segments[segIdx].count++;
    placed++;
  }

  // --- Collectibles ---
  collectibles = [];
  for (let i = 0; i < 20; i++) {
    let collectible_x;
    do {
      collectible_x = random(-worldWidth / 2, worldWidth / 2);
    } while (xInCanyon(collectible_x));
    collectibles.push({
      x_pos: collectible_x,
      y_pos: floorPos_y - 20,
      size: 10,
      isFound: false
    });
  }

  // --- Fireballs ---
  fireballs = [];
  for (let i = 0; i < 15; i++) {
    fireballs.push({
      x_pos: random(-worldWidth / 2, worldWidth / 2),
      y_pos: random(-800, -50),
      size: random(20, 40),
      speedX: random(-6, -3),
      speedY: random(4, 7)
    });
  }

  // --- Campfire ---
  campfire = {
    x_pos: worldWidth / 2 - 200,
    y_pos: floorPos_y,
    isLit: false
  };

  // --- Platforms ---
  platforms = [];
  let platformCount = 18;
  for (let i = 0; i < platformCount; i++) {
    let plat_x = random(-worldWidth / 2 + 100, worldWidth / 2 - 100);
    let plat_w = random(80, 160);
    let plat_y = floorPos_y - random(80, 180);
    platforms.push({ x: plat_x, y: plat_y, w: plat_w, h: 16 });
  }

  // Character state
  isLeft = false;
  isRight = false;
  isFalling = false;
  isPlummeting = false;
  isDead = false;
  isInvulnerable = false;
  invulnerableTimer = 0;
  lives = 3;
  score = 0;
  gameWon = false;
}

// -------- Draw --------
function draw() {
  background(100, 155, 255);

  push();
  translate(width / 2 - gameChar_x, 0);

  drawGround();
  clouds.forEach(c => { animateCloud(c); drawCloud(c); });
  fireballs.forEach(f => { animateFireball(f); drawFireball(f); });
  volcanoes.forEach(v => drawVolcano(v));
  trees_x.forEach(t => drawTree(t));
  canyons.forEach(c => drawCanyon(c));
  drawCampfire(campfire);

  // Draw platforms in front of all scenery
  drawPlatforms();

  dinosaurs.forEach(d => {
    animateDinosaur(d);
    drawDinosaur(d);
  });

  collectibles.forEach(c => {
    if (!c.isFound) {
      checkIfGameCharInCollectableRange(c);
      drawCollectable(c);
    }
  });

  // Check campfire contact and trigger win
  if (!campfire.isLit && abs(gameChar_x - campfire.x_pos) < 30 && abs(gameChar_y - campfire.y_pos) < 40) {
    campfire.isLit = true;
    gameWon = true;
  }

  // ----- Character physics -----
  if (!isDead) {
    if (isLeft) gameChar_x -= 5;
    if (isRight) gameChar_x += 5;

    gameChar_y += gameChar_vy;
    gameChar_vy += gravity;

    // Platform collision detection
    let onPlatform = false;
    for (let p of platforms) {
      // Only land if falling down (not jumping up)
      if (
        gameChar_x > p.x - 10 &&
        gameChar_x < p.x + p.w + 10 &&
        gameChar_y >= p.y - 5 &&
        gameChar_y <= p.y + 20 &&
        gameChar_vy >= 0
      ) {
        gameChar_y = p.y;
        gameChar_vy = 0;
        onPlatform = true;
        isFalling = false;
        isPlummeting = false;
      }
    }

    // Canyon logic: only apply if not on a platform
    const canyon = xInCanyon(gameChar_x);
    if (canyon && !onPlatform && gameChar_y >= floorPos_y) {
      isPlummeting = true;
      isFalling = false;
    }

    // Update falling/plummeting state
    if (!onPlatform && gameChar_y < floorPos_y) {
      isFalling = true;
    } else if (!onPlatform && gameChar_y >= floorPos_y) {
      isFalling = false;
      isPlummeting = false;
    }

    if (!canyon && !onPlatform && gameChar_y >= floorPos_y) {
      gameChar_y = floorPos_y;
      gameChar_vy = 0;
      isFalling = false;
      isPlummeting = false;
    }

    const hitDino = checkDinosaurCollisionAny();

    // handle invulnerability buffer
    if ((canyon && gameChar_y >= floorPos_y) || hitDino) {
      if (!isInvulnerable) {
        isInvulnerable = true;
        invulnerableTimer = invulnerableDuration;
      }
    }

    // ✅ improved life/invulnerability handling
    if (isInvulnerable) {
      invulnerableTimer--;
      if (invulnerableTimer <= 0) {
        lives--;
        if (lives <= 0) {
          isDead = true;
        } else {
          // respawn at floor, same x
          gameChar_y = floorPos_y;
          gameChar_vy = 0;
          isFalling = false;
          isPlummeting = false;
        }
        isInvulnerable = false;
      }
    }

    // fireball collision 
    fireballs.forEach(f => {
      if (dist(gameChar_x, gameChar_y, f.x_pos, f.y_pos) < f.size * 0.5) {
        if (!isInvulnerable) {
          isInvulnerable = true;
          invulnerableTimer = invulnerableDuration;
        }
      }
    });

  } else {
    gameChar_y += max(10, gameChar_vy);
    gameChar_vy += gravity * 1.2; // increased plummeting rate by 20%
  }

  // Flicker effect when invulnerable
  let drawCharNow = true;
  if (isInvulnerable) {
    drawCharNow = frameCount % 6 < 3;
  }
  if (drawCharNow) drawCharacter();

  // ----- Scoreboard -----
  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text("Lives: " + lives, gameChar_x - width / 2 + 20, 20);
  text("Score: " + score, gameChar_x - width / 2 + 20, 50);

  pop();

  if (isDead) {
    fill(255, 0, 0);
    textSize(60);
    textAlign(CENTER, CENTER);
    text("GAME OVER!", width / 2, height / 2);
    textSize(20);    
    text("Press SPACE to restart", width / 2, height / 2 + 50);
  }

  if (gameWon) {
    fill(0, 200, 0);
    textSize(60);
    textAlign(CENTER, CENTER);
    text("YOU WIN!", width / 2, height / 2);
    textSize(20);
    text("Press SPACE to play again", width / 2, height / 2 + 50);
  }
}

//-------- Character --------
function drawCharacter() {
  // Only show "jumpUp" arms when jumping vertically in air and NOT on a platform
  if (!isLeft && !isRight && (isFalling || isPlummeting) && !isOnPlatform()) {
    drawCharacterArms("jumpUp");
  }
  else if (isLeft && isFalling && !isOnPlatform()) {
    drawCharacterArms("jumpLeft");
  }
  else if (isRight && isFalling && !isOnPlatform()) {
    drawCharacterArms("jumpRight");
  }
  else if (isLeft) {
    drawCharacterArms("walkLeft");
  }
  else if (isRight) {
    drawCharacterArms("walkRight");
  }
  else {
    drawCharacterArms("default");
  }

  drawCharacterBody();
  drawPolkaDots();
  drawCharacterFeet();
  drawCharacterHead();
}

function drawCharacterArms(state) {
  fill(255, 204, 153);
  noStroke();

  // The top of the body rectangle is at gameChar_y - 60
  if (state === "jumpUp") {
    // Both arms up
    rect(gameChar_x - 15, gameChar_y - 60, 10, -35, 5);
    rect(gameChar_x + 5, gameChar_y - 60, 10, -35, 5);
  } else if (state === "jumpLeft") {
    // Left arm up, right arm down
    rect(gameChar_x - 15, gameChar_y - 60, 10, -35, 5);
    rect(gameChar_x + 5, gameChar_y - 60, 10, 30, 5);
  } else if (state === "jumpRight") {
    // Right arm up, left arm down
    rect(gameChar_x + 5, gameChar_y - 60, 10, -35, 5);
    rect(gameChar_x - 15, gameChar_y - 60, 10, 30, 5);
  } else if (state === "walkLeft") {
    // Left arm angled out, attached at top left
    push();
    translate(gameChar_x - 10, gameChar_y - 60);
    rotate(radians(-35));
    rect(0, 0, 10, 30, 5);
    pop();
    // Right arm angled out, attached at top right
    push();
    translate(gameChar_x + 10, gameChar_y - 60);
    rotate(radians(-10));
    rect(0, 0, 10, 30, 5);
    pop();
  } else if (state === "walkRight") {
    // Right arm angled out, attached at top right
    push();
    translate(gameChar_x + 10, gameChar_y - 60);
    rotate(radians(35));
    rect(0, 0, 10, 30, 5);
    pop();
    // Left arm straight down, attached at top left (on top of body)
    rect(gameChar_x - 15, gameChar_y - 60, 10, 30, 5);
  } else {
    // Default: both arms down
    rect(gameChar_x - 15, gameChar_y - 60, 10, 30, 5);
    rect(gameChar_x + 5, gameChar_y - 60, 10, 30, 5);
  }
}

function drawCharacterBody() { fill(255, 128, 0); rect(gameChar_x - 12, gameChar_y - 60, 25, 50); }
function drawCharacterHead() {
  // Head base
  fill(255, 204, 153); // skin tone
  ellipse(gameChar_x, gameChar_y - 69, 17, 17);

  // Hair (top)
  fill(0); // black
  arc(gameChar_x, gameChar_y - 69, 17, 17, PI, 0, CHORD);

  // Beard (bottom)
  fill(0); // black
  rect(gameChar_x - 8.5, gameChar_y - 69, 17, 8, 4);

  // Face (no hair/beard area)
  fill(255, 204, 153); // skin tone
  arc(gameChar_x, gameChar_y - 65, 13, 10, 0, PI, CHORD);
}
function drawPolkaDots() { fill(0); ellipse(gameChar_x - 7, gameChar_y - 50, 5, 5); ellipse(gameChar_x + 7, gameChar_y - 45, 5, 5); ellipse(gameChar_x - 5, gameChar_y - 38, 5, 5); ellipse(gameChar_x + 5, gameChar_y - 30, 5, 5); ellipse(gameChar_x - 8, gameChar_y - 25, 5, 5); }
function drawCharacterFeet() { fill(255, 204, 153); triangle(gameChar_x - 12, gameChar_y - 10, gameChar_x, gameChar_y, gameChar_x + 12, gameChar_y - 10); }

// -------- Input --------
function keyPressed() {
  if (!isDead) {
    if (keyCode === LEFT_ARROW) isLeft = true;
    if (keyCode === RIGHT_ARROW) isRight = true;

    // Allow jump if on floor or on platform (even over canyon)
    if (
      keyCode === UP_ARROW &&
      (
        abs(gameChar_y - floorPos_y) < 0.1 ||
        isOnPlatform()
      )
    ) {
      gameChar_vy = -jumpStrength;
    }
  } else if (keyCode === 32) {
    setup();
  }
}

function keyReleased() {
  if (keyCode === LEFT_ARROW) isLeft = false;
  if (keyCode === RIGHT_ARROW) isRight = false;
}

// -------- Background Elements --------
function drawGround() {
  noStroke();
  fill(101, 35, 2);
  rect(-worldWidth, floorPos_y, worldWidth * 2, height - floorPos_y);
}

function drawVolcano(v) {
  fill(120, 70, 50);
  triangle(
    v.pos_x - v.width / 2, v.pos_y + v.height / 2,
    v.pos_x, v.pos_y - v.height / 2,
    v.pos_x + v.width / 2, v.pos_y + v.height / 2
  );
  fill(255, 80, 0, 200);
  triangle(
    v.pos_x - 10, v.pos_y - v.height / 2 + 10,
    v.pos_x, v.pos_y - v.height / 2 - 40,
    v.pos_x + 10, v.pos_y - v.height / 2 + 10
  );
}

function animateCloud(c) {
  c.pos_x += 0.2;
  if (c.pos_x > worldWidth / 2 + 120) c.pos_x = -worldWidth / 2 - 120;
}
function drawCloud(c) {
  noStroke();
  fill(255);
  ellipse(c.pos_x, c.pos_y, c.size * 1.2);
  ellipse(c.pos_x - 40, c.pos_y, c.size);
  ellipse(c.pos_x + 40, c.pos_y, c.size);
}

// -------- Fireballs --------
function animateFireball(f) {
  f.x_pos += f.speedX;
  f.y_pos += f.speedY;
  if (f.y_pos >= floorPos_y) {
    f.y_pos = random(-800, -50);
    f.x_pos = random(-worldWidth / 2, worldWidth / 2);
  }
  if (f.x_pos < -worldWidth / 2 - 200) f.x_pos = worldWidth / 2 + 200;
}
function drawFireball(f) {
  push();
  translate(f.x_pos, f.y_pos);
  noStroke();
  fill(255, 100, 0, 140); ellipse(0, 0, f.size * 1.8);
  fill(255, 150, 0);      ellipse(0, 0, f.size * 1.2);
  fill(255, 220, 0);      ellipse(0, 0, f.size * 0.8);
  fill(255, 255, 255);    ellipse(0, 0, f.size * 0.4);
  pop();
}

// -------- Trees --------
function drawTree(t) {
  // Trunk: long, thin, dark triangle
  fill(40, 30, 20); // dark brown-black
  noStroke();
  triangle(
    t.pos_x - 8, t.pos_y + 50,
    t.pos_x + 8, t.pos_y + 50,
    t.pos_x, t.pos_y - 80
  );

  // Branches: abstract, multiple lines
  stroke(40, 30, 20);
  strokeWeight(4);

  // Main branches
  line(t.pos_x, t.pos_y - 40, t.pos_x - 30, t.pos_y - 70);
  line(t.pos_x, t.pos_y - 50, t.pos_x + 30, t.pos_y - 90);
  line(t.pos_x, t.pos_y - 60, t.pos_x - 20, t.pos_y - 110);
  line(t.pos_x, t.pos_y - 70, t.pos_x + 20, t.pos_y - 120);

  // Smaller branches
  strokeWeight(2);
  line(t.pos_x - 15, t.pos_y - 60, t.pos_x - 25, t.pos_y - 80);
  line(t.pos_x + 15, t.pos_y - 80, t.pos_x + 25, t.pos_y - 100);
  line(t.pos_x - 10, t.pos_y - 90, t.pos_x - 18, t.pos_y - 110);
  line(t.pos_x + 10, t.pos_y - 100, t.pos_x + 18, t.pos_y - 120);

  noStroke();
}

// -------- Canyons --------
function drawCanyon(c) {
  noStroke();
  fill(100, 155, 255);
  rect(c.x_pos, c.y_pos, c.width, height - c.y_pos);
}

// -------- Collectibles --------
function checkIfGameCharInCollectableRange(c) {
  if (!c.isFound) {
    var d = dist(gameChar_x, gameChar_y, c.x_pos, c.y_pos);
    if (d < 30) {
      c.isFound = true;
      score += 10;
    }
  }
}
function drawCollectable(c) {
  if (!c.isFound) {
    fill(255, 236, 214);
    rect(c.x_pos - 5, c.y_pos - 20, 10, 40);
    ellipse(c.x_pos - 5, c.y_pos - 20, 10);
    ellipse(c.x_pos + 3, c.y_pos - 20, 10);
    fill(205, 69, 0);
    ellipse(c.x_pos, c.y_pos + 10, 35, 50);
  }
}

// -------- Dinosaurs --------
function animateDinosaur(d) {
  d.pos_x += d.speed * d.direction;
  if (d.pos_x <= d.leftLimit) d.direction = 1;
  if (d.pos_x >= d.rightLimit) d.direction = -1;
}
function drawDinosaur(d) {
  push();
  translate(d.pos_x, d.pos_y);
  if (d.direction < 0) scale(-1, 1);

  noStroke();
  fill(d.color[0], d.color[1], d.color[2]);
  ellipse(0, 0, 80, 40);
  triangle(-40, 0, -70, -15, -70, 15); // tail
  ellipse(45, -10, 40, 30); // head
  fill(255); ellipse(52, -15, 10, 10);
  fill(0); ellipse(52, -15, 5, 5);
  pop();
}

// -------- Campfire --------
function drawCampfire(campfire) {
  push();
  translate(campfire.x_pos, campfire.y_pos);

  // Draw logs
  stroke(80, 50, 20);
  strokeWeight(8);
  line(-18, 0, 18, 0);
  line(-10, 8, 10, -8);
  noStroke();

  // Draw unlit or lit fire
  if (campfire.isLit) {
    // Fire (animated)
    for (let i = 0; i < 3; i++) {
      let flameColor = [255, 140, 0];
      if (i === 1) flameColor = [255, 200, 0];
      if (i === 2) flameColor = [255, 255, 180];
      fill(...flameColor, 180 - i * 40);
      ellipse(random(-6, 6), -18 - i * 8 + random(-2, 2), 22 - i * 6, 30 - i * 8);
    }
  } else {
    // Unlit: show some gray smoke
    fill(120, 120, 120, 80);
    ellipse(0, -22, 18, 12);
    ellipse(-8, -18, 10, 8);
    ellipse(8, -18, 10, 8);
  }

  pop();
}

// -------- Platforms drawing --------
function drawPlatforms() {
  for (let p of platforms) {
    noStroke();
    fill(90, 60, 30);
    rect(p.x, p.y, p.w, p.h, 4);
    fill(140, 90, 50);
    rect(p.x, p.y - 6, p.w, 6, 4, 4, 0, 0); // top lip
  }
}
