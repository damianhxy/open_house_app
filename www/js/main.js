$(function() {
    var CONSTANTS = null;
    var $current_page = null;

    $(window).on("hashchange", function() {
        render(decodeURI(window.location.hash));
    });

    function render(url) {
        $current_page.hide();
        if (!$(url).length) url = "#error";
        console.log("Rendering:", url);
        var $url = $(url);
        var $back = $("#backBtn");
        $url.show();
        $current_page = $url;
        $(".navbar-brand").text($url.data("title"));
        if ($url.data("back")) {
            $back.attr("href", $url.data("back"));
            $(".navbar-brand").addClass("navbar-brand-shifted");
            $back.show();
        } else {
            $(".navbar-brand").removeClass("navbar-brand-shifted");
            $back.hide();
        }
    }

    function displayConnectivity() {
        var $icon = $("#nowifi");
        if (navigator.onLine) {
            $icon.hide();
        } else {
            $icon.show();
        }
    }

    function getFirebaseData() {
        return JSON.parse(localStorage.getItem("data"));
    }

    function compilePages() {
        var firebaseData = getFirebaseData();
        var templates = $("[type='x-handlebars-template']");
        templates.each(function(i, e) {
            var $e = $(e);
            var templateScript = $e.html();
            var compiledTemplate = Handlebars.compile(templateScript);
            console.log("Compiled template:", e.id);
            $e.closest("script").get(0).outerHTML = compiledTemplate(firebaseData);
        });
        $current_page = $(".page"); // Hide all the pages
        render(decodeURI(window.location.hash) || "#home");
    }

    function updateConstants() {
        CONSTANTS = getFirebaseData().Constants;
    }

    function pullFirebaseData() {
        console.info("Executing pullFirebaseData()");
        var config = {
          apiKey: "AIzaSyBF3kHt1uyz4_FYcd04uEPk_hoHFKHPCug",
          authDomain: "open-house-app.firebaseapp.com",
          databaseURL: "https://open-house-app.firebaseio.com",
          projectId: "open-house-app",
          storageBucket: "open-house-app.appspot.com",
          messagingSenderId: "935185990875"
        };
        firebase.initializeApp(config);
        firebase.database().ref("/").once("value")
        .then(function(val) {
           localStorage.setItem("data", JSON.stringify(val));
           postPullHook();
           init();
        });
    }

    function postPullHook() {
        console.info("Executing postPullHook()");
        var firebaseData = getFirebaseData();
        // Convert point tiers into array and sort
        var arr = Object.values(firebaseData.Constants.PRIZE_LIST);
        arr.sort(function(a, b) {
            return a.points < b.points ? -1 : 1;
        });
        firebaseData.Constants.PRIZE_LIST = arr;
        localStorage.setItem("data", JSON.stringify(firebaseData));
    }

    function init() {
        console.info("Executing init()");
        initialisePoints();
        displayConnectivity();
        updateConstants();
        compilePages();
        displayPoints();
        console.timeEnd("init");
    }

    $("#updateData").click(function() {
        localStorage.removeItem("data");
        location.reload();
    });

    /* Code Page */

    function initialisePoints(force = false) {
        console.info("Initialising points system");
        if (!localStorage.getItem("currentPoints") || force)
            localStorage.setItem("currentPoints", 0);
        if (!localStorage.getItem("enteredCodes") || force)
            localStorage.setItem("enteredCodes", "[]");
        if (!localStorage.getItem("giftClaimed") || force)
            localStorage.setItem("giftClaimed", false);
    }

    function getCurrentPoints() {
        return parseInt(localStorage.getItem("currentPoints"));
    }

    function getEnteredCodes() {
        return JSON.parse(localStorage.getItem("enteredCodes"));
    }

    function didGiftClaimed() {
        return JSON.parse(localStorage.getItem("giftClaimed"));
    }

    function processCode(code) {
        var codes = getFirebaseData().Codes;
        var keys = Object.keys(codes);
        // Check if the code exists
        var key = 0;
        keys.forEach(function(e) {
            if (codes[e].code === code) key = e;
        });
        if (!key) {
            console.warn("Invalid code");
            eModal.alert("Invalid Code!", "Error");
            return;
        }
        // Check if it was already entered
        var enteredCodes = getEnteredCodes();
        if (~ enteredCodes.indexOf(key)) {
            console.warn("Duplicate code");
            eModal.alert("Code was already entered!", "Error");
            return;
        }
        // Valid
        addCode(key);
        changePoints(codes[key].value);
        eModal.alert(codes[key].msg, codes[key].desc);
    }

    function changePoints(amt) {
        var points = getCurrentPoints();
        points += amt;
        localStorage.setItem("currentPoints", points);
    }

    function addCode(id) {
        var codes = getEnteredCodes();
        codes.push(id);
        localStorage.setItem("enteredCodes", JSON.stringify(codes));
    }

    function displayPoints() {
        console.info("Displaying points");
        if (didGiftClaimed()) {
             $("#pointTotal").text("-- Gift Claimed --");
             return;
        }
        var points = getCurrentPoints();
        $("#pointTotal").text(points);
        $("#pointTiers tr").each(function(i, e) {
            var $e = $(e);
            if (parseInt($e.data("points")) <= points) {
                $e.attr("class", "success");
            } else {
                $e.attr("class", "danger");
            }
        });
    }

    function executeAdminCommand(cmd) {
        var instruction = cmd.substr(0, cmd.indexOf(' '));
        var value = cmd.substr(cmd.indexOf(' ') + 1);
        console.log("Admin Command:", instruction, value);
        if (instruction === "add") {
            console.log("Adding", value, "points");
            changePoints(parseInt(value));
        } else if (instruction === "deduct") {
            console.log("Deducting", value, "points");
            changePoints(-parseInt(value));
        } else if (instruction === "set") {
            console.log("Setting to", value, "points");
            changePoints(parseInt(value) - getCurrentPoints());
        } else if (instruction === "unclaim") {
            console.log("Unclaiming gift");
            localStorage.setItem("giftClaimed", false);
        } else if (instruction === "reset") {
            console.info("Clearing points system");
            initialisePoints(true);
        } else if (instruction === "code") {
            console.info("Executing arbitrary code");
            eval(value);
        }
        displayPoints(); // Need to display since it is async
    }

    $("#codeSubmit").on("submit", function(e) {
        e.preventDefault();
        var code = $("[name='code']").val();
        console.log("Entered code:", code);
        if (code === CONSTANTS.ADMIN_CODE) {
            console.info("Displayed admin panel");
            eModal.prompt("Enter command", "Admin Panel")
            .then((cmd) => executeAdminCommand(cmd));
        } else if (code === CONSTANTS.CLAIM_CODE) {
            console.info("Claiming gift");
            if (didGiftClaimed()) {
                eModal.alert("Gift already claimed.", "Error!");
                return;
            }
            var maxIdx = -1;
            var points = getCurrentPoints();
            var $pointTiers = $("#pointTiers tr");
            $pointTiers.each(function(i, e) {
                var $e = $(e);
                if (parseInt($e.data("points")) <= points) maxIdx = i;
            });
            if (~ maxIdx) {
                var $item = $($pointTiers[maxIdx]);
                $pointTiers.attr("class", "warning");
                $item.attr("class", "success");
                localStorage.setItem("giftClaimed", true);
                eModal.alert($item.text(), "Gift Claimed");
            } else {
                eModal.alert("Insufficient points to claim anything", "Error!");
            }
        } else {
            processCode(code);
        }
        displayPoints();
    });

    /* CCA Page */
    $(".btn-cca").click(function(e) {
        var $target = $(e.target)
        var tag = $target.text().trim();
        console.log("Toggling tag", tag);
        var state = !$target.data("active");
        $target.data("active", state);
        $target.toggleClass("btn-success", state);
        $target.toggleClass("btn-danger", !state);
        $target.children().first().toggleClass("fa-toggle-on", state);
        $target.children().first().toggleClass("fa-toggle-off", !state);
        if (state) {
            $("[data-cca='" + tag + "']").show();
        } else {
            $("[data-cca='" + tag + "']").hide();
        }
    });

    $(window).on("online offline", displayConnectivity);
    // TODO: Eventually, hardcode some data and pull at intervals
    // TODO: Add loading spinner
    // TODO: Don't try to pull if user is offline
    console.time("init");
    if (!localStorage.getItem("data")) pullFirebaseData();
    else init();
});