  function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function step1() {
  return new Promise(resolve => {
    console.log("GraveMap.js");
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}

function step2() {
  return new Promise(resolve => {
    console.log("server.js");
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}

function step3() {
  console.log("Step 3: Opening View-only map...");
  window.open("/viewmapap", "_blank");
}

// Run steps sequentially
step1()
  .then(() => step2())
  .then(() => step3())
  .catch(err => console.error("Error during steps:", err));


  async function runSteps() {
  try {
    await step1();
    await step2();
    step3();
  } catch (err) {
    console.error("Error during steps:", err);
  }
}

runSteps();
