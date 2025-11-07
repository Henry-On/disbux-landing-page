
document.addEventListener("DOMContentLoaded", init_App);
function init_App() { 

  const body = document.querySelector('body');
  const header = document.querySelector(".header");
  let modeSwitch = document.querySelector("#mode-switch");
  const menuHamburger = document.getElementById("menu-hamburger");

    // set current year for footer
  document.getElementById("current-year").innerText = new Date().getFullYear();
  
  // prevent hiding of header when mouse is over it
  let isMouseOnHeader = false;
  header.addEventListener("mouseenter", () => {
    isMouseOnHeader = true;
  })
  header.addEventListener("mouseleave", () => {
    isMouseOnHeader = false;
  })

  menuHamburger.addEventListener("click", function() {
    this.classList.toggle("animate");
    body.classList.toggle("menu-hidden");
  });

  Array.from(document.querySelectorAll("[data-scrollTo]")).forEach(function(e) {
    e.addEventListener("click", (current) => {
      current.preventDefault();
      let section = e.getAttribute("data-scrollTo");
      document.getElementById(section).scrollIntoView({ behavior: 'smooth' });
    })
  });

  // auto increment textarea height on user ipnut
  // document.getElementsByTagName("textarea")[0].addEventListener('input', function () {
  //   this.style.height = 'auto';
  //   this.style.height = this.scrollHeight + 'px';
  // });

  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  const hTL = gsap.timeline();
  hTL.from("#hero-section .wrapper-texts", {y:-50, opacity:0, scale:0.9, duration:1})
  .call(()=>document.querySelector("body").classList.add('show-header'));

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

  gsap.utils.toArray(".slide-in").forEach(element => {
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

  gsap.from(".tech-skill", {
    duration: .5, 
    scale: 0.8,
    opacity: 0, 
    stagger: 0.1, 
    ease: "power3.inOut",
    scrollTrigger: {
      trigger: ".tech-skill",
      start: "top 90%",   // trigger when element is 50% into viewport
      toggleActions: "play none none reset",
    }
  
  });

  gsap.from(".project-card", {
    duration: .75, 
    scale: 0.8,
    opacity: 0, 
    stagger: 0.1, 
    ease: "power3.inOut",
    scrollTrigger: {
      trigger: ".project-card",
      start: "top 70%",
      toggleActions: "play none none reset",
    }
  
  });

  gsap.from(".form-field", {
    y: 50,
    duration: 0.5,
    stagger: 0.07, 
    ease: "power3.inOut",
    scrollTrigger: {
      trigger: ".form-field",
      start: "top 90%", 
      toggleActions: "play none none reset",
    }
  
  });

}



