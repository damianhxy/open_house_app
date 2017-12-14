$(function() {
    var CONSTANTS = {
        ADMIN_CODE: "KtDybrptUsdt3fzJmDhMKRfd",
        CLAIM_CODE: "claim"
    };

    $(window).on("hashchange", function() {
        render(decodeURI(window.location.hash));
    });

    function render(url) {
        console.log("Rendering:", url);
        $(".page").hide();
        if (!$(url).length) url = "#error";
        var $url = $(url);
        var $back = $("#backBtn");
        $url.show();
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
        console.log(firebaseData);
        var templates = $("[type='x-handlebars-template']");
        templates.each(function(i, e) {
            var $e = $(e);
            var templateScript = $e.html();
            var compiledTemplate = Handlebars.compile(templateScript);
            console.log("Compiled template:", e.id);
            $e.closest("script").get(0).outerHTML = compiledTemplate(firebaseData);
        });
        render(decodeURI(window.location.hash) || "#home");
    }

    function updateConstants() {
        CONSTANTS = getFirebaseData().Constants;
    }

    function pullFirebaseData() {
        var config = {
          apiKey: "AIzaSyBF3kHt1uyz4_FYcd04uEPk_hoHFKHPCug",
          authDomain: "open-house-app.firebaseapp.com",
          databaseURL: "https://open-house-app.firebaseio.com",
          projectId: "open-house-app",
          storageBucket: "open-house-app.appspot.com",
          messagingSenderId: "935185990875"
        };
        firebase.initializeApp(config);
        var database = firebase.database();
        console.info("Reading firebase");
        firebase.database().ref("/").once("value").then(function(val) {
           localStorage.setItem("data", JSON.stringify(val));
           compilePages();
           updateConstants();
        });
    }

    $("#updateData").click(function() {
        localStorage.removeItem("data");
        location.reload();
    });

    /* Code Page */

    function initialise(force = false) {
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
        var [instruction, value] = cmd.split(" ");
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
            initialise(true);
        } else if (instruction === "code") {
            console.info("Executing arbitrary code");
            eval(value);
        }
        displayPoints(); // Need to display since it is async
    }

    $("#codeSubmit").click(function(e) {
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

    // Init
    initialise();
    displayPoints();
    displayConnectivity();
    $(window).on("online offline", displayConnectivity);
    if (!localStorage.getItem("data")) pullFirebaseData();
    else {
        compilePages(); 
        updateConstants();
    }
});