
document.addEventListener("DOMContentLoaded", init_App);
function init_App() { 

  const body = document.querySelector('body');

  // set current year for footer
  document.getElementById("current-year").innerText = new Date().getFullYear();


  document.getElementById("menu-hamburger").addEventListener("click", function() {
    this.classList.toggle("animate");
    body.classList.toggle("menu-hidden");
  });

  // auto increment textarea height on user ipnut
  document.getElementsByTagName("textarea")[0].addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  document.getElementById("user-message").addEventListener("submit", (e) => {

    e.preventDefault();
    let messageForm = e.target;
    let submitBtn = messageForm.querySelector("#btn-send-message");
    let formData = new FormData(messageForm);

    const responseFields = Array.from(document.querySelectorAll(".form-response"));
    
    let preSubmitText = submitBtn.textContent;
    submitBtn.textContent = "Processing";
    submitBtn.classList.add("processing");

    fetch("/send-mail.php", {
      method: "POST",
      body: formData
    })
    .then(response => {console.log(response); return response.text()})
    .then(text => {
      if(!text) throw new Error(`Empty response`);
      return JSON.parse(text);
    })
    .then(data => {
      console.log(data);
      if(data.errors) showResponse(data.errors);

      if(data.success){

        responseFields.forEach((e) => e.innerHTML = ""); // clear all old form errors

        // print successful message
        const msgbody = messageForm.querySelector(".response-body");
        msgbody.classList.add("success");
        msgbody.innerHTML = "I have received your message, I will reply soon!";

        messageForm.reset(); // reset the form field values
      }
      
    })
    .catch(error => console.log(error))
    .finally(()=>{
      submitBtn.textContent = preSubmitText;
      submitBtn.classList.remove("processing");
    });

    function showResponse(objErrors) {

      // check if errors exist
      if (objErrors === undefined)  return;

      responseFields.forEach((e) => {
        const responseClass = Array.from(e.classList).find(c => c.startsWith('response-'));
        if (responseClass) {
          const name = responseClass.replace('response-', '');
          e.innerHTML = name in objErrors ? objErrors[name] : "";
        }
      })  
    }


  });

  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".header", {y:-50, opacity:0, scale:0.9, duration:1});

  const heroTimeline = gsap.timeline();
  heroTimeline.from(".hero-section .title", {opacity:0, scale:0.9, duration:0.25})
  .from(".hero-section p", {y:50, opacity:0, scale:0.9, duration:0.25})
  .from(".hero-section .hero-btns", {y:50, opacity:0, scale:0.9, duration:0.25})

  gsap.utils.toArray(".fade-in").forEach(element => {
    gsap.from(element, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3",
      scrollTrigger: {
        trigger: element,
        start: "top 80%",
        toggleActions: "play none none reset",
      }
    });
  });

  gsap.utils.toArray(".animate-zoom-in").forEach(element => {
    gsap.from(element, {
      scale:0.85,
      opacity: 0,
      duration: 1,
      ease: "power3",
      scrollTrigger: {
        trigger: element,
        start: "top 80%",
        toggleActions: "play none none reset",
      }
    });
  });

  gsap.utils.toArray(".animate-slide-in").forEach(element => {
    gsap.from(element, {
      y: 50,
      duration: 1,          
      ease: "power3",   
      scrollTrigger: {
        trigger: element,
        start: "top 80%",
        toggleActions: "play none none reset",
      }
    });
  });

  gsap.from(".zoom-in-stagger", {
    duration: 0.75, 
    scale: 0.8,
    opacity: 0, 
    stagger: 0.1, 
    ease: "power3.inOut",
    scrollTrigger: {
      trigger: ".zoom-in-stagger",
      start: "top 90%", 
      toggleActions: "play none none reset",
    }
  
  });

}



