
// App detection and download handler
function handleAppDownload(event) {
  event.preventDefault();
  
  const downloadBtn = event.target.closest('a');
  const downloadText = downloadBtn.querySelector('.download-text');
  const loadingSpinner = downloadBtn.querySelector('.loading-spinner');
  
  // Show loading state
  downloadText.style.display = 'none';
  loadingSpinner.style.display = 'inline-block';
  
  // Custom URL scheme for your app (you'll need to configure this in your mobile app)
  const appScheme = 'disbux://open';
  const fallbackUrl = 'files/disbux-release.apk';
  
  // Create a hidden iframe to attempt opening the app
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = appScheme;
  document.body.appendChild(iframe);
  
  // Set a timeout to detect if app opened
  let appOpened = false;
  const startTime = Date.now();
  
  // If app doesn't open within 2.5 seconds, download APK
  const fallbackTimer = setTimeout(() => {
    if (!appOpened) {
      // App not installed, trigger download
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = 'disbux-release.apk';
      link.click();
      
      // Show download message
      showNotification('App not found. Downloading Disbux APK...', 'info');
    }
    cleanup();
  }, 2500);
  
  // Listen for page visibility change (indicates app might have opened)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      appOpened = true;
      clearTimeout(fallbackTimer);
      showNotification('Opening Disbux app...', 'success');
      cleanup();
    }
  };
  
  // Listen for blur event (another indicator app might have opened)
  const handleBlur = () => {
    const timeDiff = Date.now() - startTime;
    if (timeDiff < 1000) { // If blur happens quickly, likely app opened
      appOpened = true;
      clearTimeout(fallbackTimer);
      showNotification('Opening Disbux app...', 'success');
      cleanup();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  
  function cleanup() {
    // Reset button state
    downloadText.style.display = 'inline';
    loadingSpinner.style.display = 'none';
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    
    // Remove iframe
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

// Enhanced app detection using multiple methods
function detectAndOpenApp() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  
  if (isAndroid) {
    // For Android, try intent URL first, then custom scheme
    const intentUrl = 'intent://open#Intent;scheme=disbux;package=com.hnrycdr.disbux;end';
    const customScheme = 'disbux://open';
    
    // Try intent URL first (more reliable on Android)
    window.location.href = intentUrl;
    
    // Fallback to custom scheme after a short delay
    setTimeout(() => {
      window.location.href = customScheme;
    }, 500);
    
  } else if (isIOS) {
    // For iOS, use custom scheme
    window.location.href = 'disbux://open';
  } else {
    // For desktop/other platforms, just download
    const link = document.createElement('a');
    link.href = 'files/disbux-release.apk';
    link.download = 'disbux-release.apk';
    link.click();
  }
}

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.app-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `app-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

document.addEventListener("DOMContentLoaded", init_App);
function init_App() {

  const body = document.querySelector('body');

  // set current year for footer
  if (document.getElementById("current-year")) {
    document.getElementById("current-year").innerText = new Date().getFullYear();
  }

  if (document.getElementById("menu-hamburger")) {
    document.getElementById("menu-hamburger").addEventListener("click", function () {
      this.classList.toggle("animate");
      body.classList.toggle("menu-hidden");
    });
  }


  // auto increment textarea height on user ipnut
  if (document.getElementsByTagName("textarea")[0]) {
    document.getElementsByTagName("textarea")[0].addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }

  const messageForm = document.getElementById("user-message")
  if (messageForm) {
    messageForm.addEventListener("submit", (e) => {

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
        .then(response => { console.log(response); return response.text() })
        .then(text => {
          if (!text) throw new Error(`Empty response`);
          return JSON.parse(text);
        })
        .then(data => {
          console.log(data);
          if (data.errors) showResponse(data.errors);

          if (data.success) {

            responseFields.forEach((e) => e.innerHTML = ""); // clear all old form errors

            // print successful message
            const msgbody = messageForm.querySelector(".response-body");
            msgbody.classList.add("success");
            msgbody.innerHTML = "I have received your message, I will reply soon!";

            messageForm.reset(); // reset the form field values
          }

        })
        .catch(error => console.log(error))
        .finally(() => {
          submitBtn.textContent = preSubmitText;
          submitBtn.classList.remove("processing");
        });

      function showResponse(objErrors) {

        // check if errors exist
        if (objErrors === undefined) return;

        responseFields.forEach((e) => {
          const responseClass = Array.from(e.classList).find(c => c.startsWith('response-'));
          if (responseClass) {
            const name = responseClass.replace('response-', '');
            e.innerHTML = name in objErrors ? objErrors[name] : "";
          }
        })
      }
    });
  }

  if (document.getElementById("deleteForm")) {

    const deleteForm = document.getElementById('deleteForm')
    let userMessage = deleteForm.getElementsByClassName("form-response")[0]

    deleteForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      userMessage.innerText = ""
      userMessage.classList.remove("success")

      const form = e.target
      let email = form.email.value.trim()
      let message = form.message.value.trim()

      if (!email || !message) {
        userMessage.innerText = "Both email and message are required"
        return
      }

      try {

        const requestDeletion = await fetch('/scripts/request-account-deletion.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, message })
        })

        const data = await requestDeletion.json()
        // const data = await requestDeletion.text()
        // console.log(data)
        // return

        if (!requestDeletion.ok) {
          userMessage.innerText = data.message || "An error occured please try again"
          console.log("data", data)
          return
        }

        if (!data.success) {
          userMessage.innerText = data.message || "An error occured please try again"
          return
        }

        userMessage.classList.add("success")
        userMessage.innerText = data.message || "Request submitted, check your email"

        // reset the from fields
        email = form.email.value = ""
        message = form.message.value = ""

      } catch (error) {
        console.error("[couldn't request account deletion]", error)
      }
    })
  }

  if (document.getElementById("confirmDeletion")) {

    document.getElementById("confirmDeletion").addEventListener("click", async (e) => {

      const button = e.target
      const buttonText = button.innerText

      try {

        button.innerText = "Processing, please hold..."

        // get the query string from url
        const urlParams = new URLSearchParams(window.location.search)

        const token = urlParams.get("token")
        if (!token) {
          alert("This link is either broken or malformed")
          return
        }

        const requestDeletion = await fetch('/scripts/confirm-account-deletion.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await requestDeletion.json()
        // const data = await requestDeletion.text()
        // console.log(data)
        // return

        if (!requestDeletion.ok) {
          alert(data.message || "An error occured please try again")
          return
        }

        if (!data.success) {
          alert(data.message || "An error occured please try again")
          return
        }

        const pageContent = document.getElementById("pageContent")
        pageContent.querySelector(".title").innerText = "Completed"
        pageContent.querySelector("p").innerText = "Your account was successfully deleted. You can now exit this page"

        // delete button
        button.remove()

      } catch (error) {
        console.log("[couldn't delete account]", error)
      }
      finally {
        if(button) button.innerText = buttonText
      }
    })
  }

  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".header", { y: -50, opacity: 0, scale: 0.9, duration: 1 });

  const heroTimeline = gsap.timeline();
  heroTimeline.from(".hero-section .title", { opacity: 0, scale: 0.9, duration: 0.25 })
    .from(".hero-section p", { y: 50, opacity: 0, scale: 0.9, duration: 0.25 })
    .from(".hero-section .hero-btns", { y: 50, opacity: 0, scale: 0.9, duration: 0.25 })

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
      scale: 0.85,
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



