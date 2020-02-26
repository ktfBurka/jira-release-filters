// ==UserScript==

// @name         Jira Release Filters

// @namespace    http://tampermonkey.net/

// @version      0.2

// @description  try to take over the world!

// @author       You

// @match        https://prospectsoft.atlassian.net/projects/PROS/versions/*

// @updateURL    https://github.com/ktfBurka/jira-release-filters.git

// @downloadURL  https://github.com/ktfBurka/jira-release-filters.git

// @grant        none

// ==/UserScript==

// TODO CREATE SEPARATE HEADER BECAUSE CURRENT ONE HAS PRE BUILT CLICK HANDLERS

(function() {
  "use strict";
  var style = document.createElement("style");

  style.type = "text/css";

  style.innerHTML = `
.display-none {
display: none;
}

.custom-tab-active {
border-bottom: 3px solid red;
}

#custom-filter-li {
margin-top: 5px;
margin-bottom: 5px;
border-bottom: 3px solid white
}

#custom-filter-li:hover {
cursor: pointer;
border-bottom: 3px solid #d3d3d3
}

#not-me-box {
margin: 5px auto auto 20px
}

.tab-count.passedFunctional {
color: #00dd0b !important
}

.tab-count.done {
color: #00875A !important
}

.tab-count.inProgress {
color: #8ba3e8 !important
}

.tab-count.functionalTesting {
color: #1e54e8 !important
}

.tab-count.todo {
color: #b5b5b5 !important
}

.custom-img-container {
margin-left: 24px;
margin-top: 10px;
height: 40px;
display: flex;
align-items: center
}

.custom-img:hover {
z-index: 100 !important;
cursor: pointer !important;
margin-bottom: 10px !important;
}

.custom-img-active {
z-index: 100 !important;
border: 2px solid #353fff !important;
margin-bottom: 10px !important;
}

.custom-img-active.custom-img-active img {
width: 40px !important;
height: 40px !important
}

.custom-img {
transition: 0.1s;
border: 1px solid white;
display: inline-block;
margin-left: -6px;
margin-right: 0px;
border-radius: 50%
}

.author-avatar-wrapper.avatar-with-name.custom-avatar {
display: flex
}

.custom-img img:hover {
width: 40px !important;
height: 40px !important
}

.custom-img img {
border: 2px solid white;
transition: .1s !important;
margin: 0 !important;
width: 35px !important;
height: 35px !important;
border-radius: 50% !important
}

#custom-search {
border: 1px solid #dfe1e6;
background: #f4f5f7;
height: 30px;
border-radius: 3px;
line-height: 1;
font-size: 14px;
width: 160px;
color: #172b4d;
margin-top: 10px;
font-weight: 400;
margin-left: 20px;
padding: auto 5px;
}
`;

  const statusNaming = {
    passedFunctional: ["qa testing"],

    done: ["done", "resolved", "closed"],

    inProgress: ["in progress"],

    functionalTesting: ["functional testing"],

    todo: ["open", "reopened"]
  };

  let avatarLink;

  let myName;

  let currentAvatars = [];

  let currentFilter = null;

  let currentSearchTerm = "";

  let lastStatuses = [];

  let excludeMe = false;

  document.getElementsByTagName("head")[0].appendChild(style);

  function createHeader(count, name) {
    return createElementFromHTML(`<li class="release-report-tab" id="custom-filter-li">

<span class="black" id="custom-filter-tab">

<span class="tab-count">${count}</span>

<span class="tab-label">Issues <br> <span class="custom-label">${name}</span></span></span></li>`);
  }

  function createImg(url, title = "Unknown") {
    return createElementFromHTML(`<div class="custom-img">

<span class="author-avatar-wrapper avatar-with-name custom-avatar"

data-tooltip="${title}" original-title="${title}"><img src="${url}"></span>

</div>`);
  }

  function createElementFromHTML(htmlString) {
    var div = document.createElement("div");

    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes

    return div.firstChild;
  }

  function printStatus() {
    console.log({
      taskType: currentFilter,
      people: currentAvatars,
      searchTerm: currentSearchTerm,
      excludeMe: excludeMe
    });
  }

  // Your code here...

  async function waitFor(query, timeout) {
    let time = 0;

    let els = document.querySelectorAll(query);

    while (!els.length && time < timeout) {
      await new Promise(r => setTimeout(r, 200));

      els = document.querySelectorAll(query);

      time += 200;
    }

    return els;
  }

  async function filterIssues(status = null, searchTerm = "") {
    const issues = await waitFor(".release-report-issues tr", 10000);

    const issuesArr = Array.from(issues);

    const notMe = document.querySelector("#not-me");

    let avatar = (await waitFor("#profileGlobalItem", 10000))[0];

    let filtered = 0;

    avatar =
      avatar.childNodes[0].childNodes[0].childNodes[0].childNodes[0]
        .childNodes[0];

    for (let issue of issuesArr) {
      let removedOne = false;

      let text = issue.querySelector(".status").textContent;

      const summary = issue.querySelector(".issue-summary").textContent;

      const key = issue.querySelector(".issue-key").textContent;

      const name = issue.querySelector(".assignee").childNodes[0].childNodes[1]
        .textContent;

      issue.classList.remove("display-none");

      const issueImg = getAvatarId(issue.querySelector(".assignee img").src);

      let avatarImg = getAvatarId(avatar.style.backgroundImage);

      if (issueImg === avatarImg) {
        myName = name;
        if (notMe.checked) {
          issue.classList.add("display-none");
          if (!removedOne) {
            filtered++;
            removedOne = true;
          }
        }
      }

      if (currentAvatars.length && !currentAvatars.find(n => n === name)) {
        issue.classList.add("display-none");
        if (!removedOne) {
          filtered++;
          removedOne = true;
        }
      }

      if (
        !(summary + key + name)
          .trim()
          .toLowerCase()
          .includes(currentSearchTerm.trim().toLowerCase())
      ) {
        issue.classList.add("display-none");
        if (!removedOne) {
          filtered++;
          removedOne = true;
        }
      }

      if (status === null) {
        continue;
      }

      if (text.trim().toLowerCase() !== status.trim().toLowerCase()) {
        issue.classList.add("display-none");
        if (!removedOne) {
          filtered++;
          removedOne = true;
        }
      }
    }
    const count = issuesArr.length - filtered;
    const countEls = document.querySelectorAll(".results-count-text");
    for (let el of countEls) {
      el.querySelector(".results-count-start").innerHTML = count ? 1 : 0;
      el.querySelector(".results-count-end").innerHTML = count;
      el.querySelector(".results-count-total.results-count-link").innerHTML =
        issuesArr.length;
    }

    currentFilter = status;
  }

  async function addNewHeader() {
    const oldHeader = await waitFor("#custom-header", 500);

    let newHeader = createElementFromHTML(
      `<div class="release-report-tab-header" id="custom-header"></div>`
    );

    let statuses = await waitFor(".status", 500);

    let uniqueStatuses = Array.from(statuses);

    uniqueStatuses.shift();

    uniqueStatuses = uniqueStatuses.map(x => x.textContent);

    if (JSON.stringify(lastStatuses) === JSON.stringify(uniqueStatuses)) {
      await filterIssues(currentFilter);

      return;
    }

    if (oldHeader.length || !statuses.length) {
      oldHeader[0].remove();

      if (!statuses.length) {
        lastStatuses = [];
        return;
      }
    }
    lastStatuses = uniqueStatuses;
    // When different tab
    let section = await waitFor("#release-report-tab-body", 500);
    if (!section.length) {
      return;
    }

    section[0].insertBefore(newHeader, section[0].childNodes[0]);

    const header = (await waitFor("#custom-header", 10000))[0];

    let statusNames = [...new Set(uniqueStatuses)];

    await statusNames.forEach(n => {
      const count = Array.from(statuses).filter(x => x.textContent === n)
        .length;

      const tab = createHeader(count, n);

      header.appendChild(tab);
    });

    let notMeBox = createElementFromHTML(`
<div id="not-me-box"><input id="not-me" type="checkbox"><label for="not-me">Exclude my tasks</label></div>`);

    header.appendChild(notMeBox);

    const notMe = document.querySelector("#not-me");

    notMe.checked = excludeMe;

    notMe.addEventListener("click", async () => {
      excludeMe = notMe.checked;
    });

    const tabs = await waitFor("#custom-filter-tab", 10000);
    if (!tabs.length) {
      currentFilter = null;
    }
    let tabMatched = false;
    await tabs.forEach(t => {
      const text = t.querySelector(".custom-label").textContent;
      if (currentFilter === text) {
        t.classList.add("custom-tab-active");
        tabMatched = true;
      }

      for (const key of Object.keys(statusNaming)) {
        if (statusNaming[key].indexOf(text.trim().toLowerCase()) !== -1) {
          const tabCount = t.querySelector(".tab-count");

          tabCount.classList.add(key);
        }
      }

      t.addEventListener("click", async event => {
        const isActive = t.classList.contains("custom-tab-active");

        await tabs.forEach(x => {
          x.classList.remove("custom-tab-active");
        });

        if (!isActive) {
          t.classList.add("custom-tab-active");
        }

        printStatus();
        await filterIssues(isActive ? null : text);
      });
    });

    currentFilter = tabMatched ? currentFilter : null;

    const avatarEls = await waitFor(
      ".author-avatar-wrapper.avatar-with-name",
      2000
    );

    const avatars = [
      ...new Set(
        Array.from(avatarEls).map(x => {
          return JSON.stringify({
            url: x.childNodes[0].src,

            title: x.childNodes[1].textContent
          });
        })
      )
    ];

    const imgContainer = createElementFromHTML(
      `<div class="custom-img-container"></div>`
    );

    header.appendChild(imgContainer);

    const container = header.querySelector(".custom-img-container");

    await avatars.forEach(a => {
      const avatar = JSON.parse(a);

      container.appendChild(createImg(avatar.url, avatar.title));
    });

    const imgs = container.querySelectorAll(".custom-img");
    let imgMatched = false;
    await imgs.forEach(img => {
      const title = img.childNodes[1].getAttribute("original-title");
      if (currentAvatars.find(t => t === title)) {
        img.classList.add("custom-img-active");
        imgMatched = true;
      }

      img.addEventListener("click", async () => {
        const isActive = img.classList.contains("custom-img-active");

        if (title === myName) {
          const notMe = document.querySelector("#not-me");

          notMe.checked = isActive ? excludeMe : isActive;
          excludeMe = notMe.checked;
        }

        if (isActive) {
          img.classList.remove("custom-img-active");

          currentAvatars = currentAvatars.filter(x => x !== title);
        } else {
          img.classList.add("custom-img-active");

          currentAvatars.push(title);
        }
        printStatus();
        await filterIssues(currentFilter);
      });
    });

    currentAvatars = imgMatched ? currentAvatars : [];

    const searchBoxEl = createElementFromHTML(`
<input id="custom-search" type="text" placeholder="Search">`);
    header.appendChild(searchBoxEl);
    const searchBox = header.querySelector("#custom-search");
    searchBox.value = currentSearchTerm;
    searchBox.addEventListener("input", () => {
      currentSearchTerm = searchBox.value;
    });
  }

  function getAvatarId(url) {
    let ids = url.split("/");

    return ids[3] + ids[4];
  }

  (async function main() {
    setInterval(async () => {
      await addNewHeader();
    }, 100);
  })();
})();
