import * as THREE from "three";
import * as dat from 'dat.gui';
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createCamera, createRenderer, runApp, updateLoadingProgressBar } from "./core-utils";
import { loadTexture } from "./common-utils";
import { quizData } from "./quizQuestions";
import worldgen_1 from "./assets/worldgen_1.gif";
import worldgen_2 from "./assets/worldgen_2.gif";
import worldgen_3 from "./assets/worldgen_3.gif";
import worldgen_4 from './assets/worldgen_4.gif';
import worldgen_5 from './assets/worldgen_5.gif';
import asteroid from './assets/asteroid.jpg'

global.THREE = THREE;
THREE.ColorManagement.enabled = true;

const params = {
  sunIntensity: 2, // brightness of the sun
  speedFactor: 20, // rotation speed
};

// Create the scene
let scene = new THREE.Scene();
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  _renderer.outputColorSpace = THREE.sRGBEncoding;
});

// Create the camera
let camera = createCamera(45, 1, 1000, { x: 0, y: 0, z: 80 });

let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;

    // adding a virtual sun using directional light
    this.dirLight = new THREE.DirectionalLight(0xffffff, params.sunIntensity);
    this.dirLight.position.set(-100, 100, 100);
    scene.add(this.dirLight);

    // updates the progress bar to 10% on the loading UI
    await updateLoadingProgressBar(0.1);

    const planetTexture = await loadTexture(worldgen_1);
    planetTexture.encoding = THREE.sRGBEncoding; // Set texture encoding
    await updateLoadingProgressBar(0.2);

    this.group = new THREE.Group();
    this.group.rotation.z = 23.5 / 360 * 2 * Math.PI;

    let planetGeo = new THREE.SphereGeometry(10, 64, 64);
    let planetMaterial = new THREE.MeshStandardMaterial({
      map: planetTexture,
      color: '#8333FF'
    });
    planetMaterial.roughness = 1;
    planetMaterial.metalness = 0.1;
    this.planet = new THREE.Mesh(planetGeo, planetMaterial);
    this.group.add(this.planet);

    this.planet.rotateY(-0.3);

    scene.add(this.group);

    // GUI controls
    const gui = new dat.GUI();
    this.stats1 = new Stats();
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"

    const colors = ['#8333FF', '#C80000', '#67D21F', '#1FD1D2', '#D2CA1F'];
    let colorIndex = 1; // Track the current color index

    // Add a button to change the color of the planet
    const planetColorButton = {
      ChangeColor: () => {
        const color = colors[colorIndex];
        this.planet.material.color.set(color);
        updateQuizContainerShadowColor(color);
        updateSubmitButtonBackgroundColor(color);
        colorIndex = (colorIndex + 1) % colors.length;
      }
    };
    gui.add(planetColorButton, 'ChangeColor').name('Change Planet Color');

    // Function to update the shadow color of the quiz container
    function updateQuizContainerShadowColor(color) {
      const quizContainer = document.getElementById('quiz-container');
      quizContainer.style.boxShadow = `0 0 10px rgba(${getRGBValues(color)}, 0.8)`;
    }

    function updateSubmitButtonBackgroundColor(color) {
      const submitButton = document.getElementById('submit-btn');
      submitButton.style.backgroundColor = color;
    }

    // Function to get RGB values from hex color
    function getRGBValues(hex) {
      const hexValue = hex.replace('#', '');
      return `${parseInt(hexValue.substring(0, 2), 16)}, ${parseInt(hexValue.substring(2, 4), 16)}, ${parseInt(hexValue.substring(4, 6), 16)}`;
    }

    // Add a button to change the texture of the planet
    const textures = [worldgen_1, worldgen_2, worldgen_3, worldgen_4, worldgen_5];
    let textureIndex = 0;

    const changeTexture = async () => {
      textureIndex = (textureIndex + 1) % textures.length;
      const newTexture = await loadTexture(textures[textureIndex]);
      this.planet.material.map = newTexture;
      this.planet.material.needsUpdate = true;
    };
    gui.add({ ChangeTexture: changeTexture }, 'ChangeTexture').name('Change Planet Texture');

    await updateLoadingProgressBar(1.0, 100)
  },

  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update();
    this.stats1.update();

    // use rotateY instead of rotation.y so as to rotate by axis Y local to each mesh
    this.planet.rotateY(interval * 0.005 * params.speedFactor);
  }
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Function to render the quiz
function renderQuiz() {
  const quizContainer = document.getElementById('quiz-container');
  const questionElement = document.getElementById('question');
  const optionsContainer = document.getElementById('options-container');
  const submitButton = document.getElementById('submit-btn');
  const resultElement = document.getElementById('result');
  const scoreElement = document.getElementById('score'); // Add score element

  let currentQuestionIndex = 0;
  let score = 0; // Initialize score counter
  let asteroidCounter = 1;
  let wrongCounter = 0;

  // Shuffle the quizData array before displaying questions
  const shuffledQuizData = shuffleArray(quizData);

  function showQuestion() {
    const currentQuestion = shuffledQuizData[currentQuestionIndex];
    questionElement.textContent = currentQuestion.question;

    optionsContainer.innerHTML = '';
    currentQuestion.options.forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.classList.add('option');
      optionElement.textContent = `${index + 1}. ${option}`;
      optionElement.addEventListener('click', () => {
        const selectedAnswer = currentQuestion.options[index];

        document.querySelectorAll('.option').forEach((el) => {
          el.classList.remove('selected');
        });

        optionElement.classList.add('selected');

        optionElement.dataset.selectedAnswer = selectedAnswer;
      });
      optionsContainer.appendChild(optionElement);
    });
  }

  async function showResult() {
    const quizContainer = document.getElementById('quiz-container');
    const scoreElement = document.getElementById('score');
    quizContainer.remove();

    await delay(2500)
    // Remove the planet from the scene
    app.group.remove(app.planet);

    const particleCount = 1000;
    const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);

    const particles = new THREE.Group(); // Group to hold particles

    // Set particle color to match the planet color
    const planetColor = app.planet.material.color.clone();

    for (let i = 0; i < particleCount; i++) {
      const particleMaterial = new THREE.MeshBasicMaterial({ color: planetColor });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.copy(app.planet.position);
      particles.add(particle);

      // Randomize particle velocity
      const velocity = new THREE.Vector3(
        Math.random() * 10 - 5,
        Math.random() * 10 - 5,
        Math.random() * 10 - 5
      );
      particle.userData.velocity = velocity;
    }

    scene.add(particles);

    // Animation parameters
    const explosionDuration = 2000; // in milliseconds
    const explosionStartTime = Date.now();

    // Animation function
    function animatePlanetShatter() {
      const currentTime = Date.now();
      const elapsed = currentTime - explosionStartTime;
      const progress = Math.min(elapsed / explosionDuration, 1);

      particles.children.forEach(particle => {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.multiplyScalar(0.98); // Slow down particles
        particle.material.opacity = 1 - progress; // Fade out particles
      });

      if (progress < 1) {
        requestAnimationFrame(animatePlanetShatter);
      }
    }
    animatePlanetShatter();

    await delay(2000)

    const resultOverlay = document.createElement('div');
    resultOverlay.classList.add('result-overlay');
    resultOverlay.innerHTML = `<div><h1>You Lost</h1><br><h1>Your Score: ${score}</h1></div>`;
    document.body.appendChild(resultOverlay);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  submitButton.addEventListener('click', async () => {
    const selectedAnswer = optionsContainer.querySelector('.option.selected')?.dataset.selectedAnswer;

    if (selectedAnswer && selectedAnswer !== quizData[currentQuestionIndex].correctAnswer) {
      for (let i = 0; i < asteroidCounter; i++) {
        await delay(500);
        animateImpactFromRandomDirection();
      }

      asteroidCounter++;
      wrongCounter++;

      await delay(1500)

      if (wrongCounter === 3) {
        showResult();
        return
      }
    } else {
      score++; // Increment score for correct answer
    }

    scoreElement.textContent = `Score: ${score}`; // Update score display

    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
      showQuestion();
    } else {
      showResult();
    }
  });

  showQuestion();
}


// Function for Asteroid
async function animateImpactFromRandomDirection() {
  const asteroidRadius = Math.random() * (3 - .5) + .5;
  const asteroidGeometry = new THREE.SphereGeometry(asteroidRadius, 32, 32);
  const asteroidMaterial = new THREE.MeshStandardMaterial({
    map: await loadTexture(asteroid),
  });

  // Create the asteroid mesh
  const impactAsteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);

  const initialDistance = 100; // Distance from the planet
  const randomDirection = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  impactAsteroid.position.copy(randomDirection.multiplyScalar(initialDistance));

  const targetPosition = app.planet.position.clone();
  const asteroidDirection = targetPosition.clone().sub(impactAsteroid.position).normalize();

  const animationDuration = 1500; // Animation duration in milliseconds
  const animationStartTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(elapsed / animationDuration, 1);

    const newPosition = new THREE.Vector3().lerpVectors(
      impactAsteroid.position,
      targetPosition,
      progress
    );
    impactAsteroid.position.copy(newPosition);

    // Rotate the asteroid around its own axis
    impactAsteroid.rotation.y += .1; //

    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    } else {
      scene.remove(impactAsteroid);

      // Create particles for explosion at impact position
      const particleCount = 200;
      const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Use white color for particles
      const particles = new THREE.Group(); // Group to hold particles

      const coneAngle = Math.PI / 4; // Angle for cone shape

      const oppositeDirection = asteroidDirection.clone().negate(); // Calculate opposite direction

      for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(impactAsteroid.position);
        particles.add(particle);

        // Calculate random direction within cone angle
        const randomAngle = Math.random() * coneAngle;
        const randomDirection = oppositeDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);

        // Randomize particle velocity within cone direction
        const velocityMagnitude = Math.random() * 2 + 1; // Random velocity magnitude
        const velocity = randomDirection.multiplyScalar(velocityMagnitude);
        particle.userData.velocity = velocity;
      }

      scene.add(particles);

      // Animation parameters for explosion
      const explosionDuration = 10000; // in milliseconds
      const explosionStartTime = Date.now();

      // Animation function for explosion
      function animateExplosion() {
        const currentTime = Date.now();
        const elapsed = currentTime - explosionStartTime;
        const progress = Math.min(elapsed / explosionDuration, 1);

        particles.children.forEach(particle => {
          particle.position.add(particle.userData.velocity);
          particle.userData.velocity.multiplyScalar(0.98); // Slow down particles
          particle.material.opacity = 1 - progress; // Fade out particles
        });

        if (progress < 1) {
          requestAnimationFrame(animateExplosion);
        } else {
          scene.remove(particles);
        }
      }
      animateExplosion();
    }
  }

  updateAnimation();

  scene.add(impactAsteroid);
}





renderQuiz();

runApp(app, scene, renderer, camera, true, undefined, undefined);
