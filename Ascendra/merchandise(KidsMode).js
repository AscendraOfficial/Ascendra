function showSection(sectionId) {

    const sections = document.querySelectorAll(".page-section");

  sections.forEach(section => {
      section.style.display = "none";
    });

    document.getElementById(sectionId).style.display = "block";
}


// Show Merchandise when the page first opens
showSection("merchandiseSection");
