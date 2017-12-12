$(function() {
    $(window).on("hashchange", function() {
            render(decodeURI(window.location.hash));
    });

    function render(url) {
        console.log("Rendering:", url);
        $(".page").hide();
        $(url).show();
        $(".navbar-brand").text($(url).data("title") || "undefined");
    }

    function displayConnectivity() {
        var $icon = $("#nowifi");
        if (navigator.onLine) {
            $icon.hide();
        } else {
            $icon.show();
        }
    }

    /* Code Page */
    var ADMIN_CODE = "hcadmin";
    var CLAIM_CODE = "claim";

    var CODES = [ /* For testing purposes */
        {desc: "IRS", code: "420blazeit", message: "What a dank memer!", id: 0, value: 1}
    ];

    function initialise(force = false) {
        console.info("Initialising points system");
        if (!localStorage.getItem("currentPoints") || force)
            localStorage.setItem("currentPoints", 0);
        if (!localStorage.getItem("enteredCodes") || force)
            localStorage.setItem("enteredCodes", "[]");
        if (!localStorage.getItem("giftClaimed") || force)
            localStorage.setItem("giftClaimed", false);
    }

    function getPoints() {
        return parseInt(localStorage.getItem("currentPoints"));
    }

    function getCodes() {
        return JSON.parse(localStorage.getItem("enteredCodes"));
    }

    function getGiftClaimed() {
        return JSON.parse(localStorage.getItem("giftClaimed"));
    }

    function processCode(code) {
        // Check if the code exists
        var idx = -1;
        CODES.forEach(function(e, i) {
            if (e.code === code) idx = i;
        });
        if (idx === -1) {
            console.warn("Invalid code");
            eModal.alert("Invalid Code!", "Error");
            return;
        }
        // Check if it was already entered
        var codes = getCodes();
        if (~ codes.indexOf(CODES[idx].id)) {
            console.warn("Duplicate code");
            eModal.alert("Code was already entered!", "Error");
            return;
        }
        // Valid
        addCode(CODES[idx].id);
        changePoints(CODES[idx].value);
        eModal.alert(CODES[idx].message, CODES[idx].desc);
    }

    function changePoints(amt) {
        var points = getPoints();
        points += amt;
        localStorage.setItem("currentPoints", points);
    }

    function addCode(id) {
        var codes = getCodes();
        codes.push(id);
        localStorage.setItem("enteredCodes", JSON.stringify(codes));
    }

    function displayPoints() {
        console.info("Displaying points");
        if (getGiftClaimed()) {
             $("#pointTotal").text("-- Gift Claimed --");
             return;
        }
        var points = getPoints();
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
            changePoints(parseInt(value) - getPoints());
        } else if (instruction === "unclaim") {
            console.log("Unclaiming gift");
            localStorage.setItem("giftClaimed", false);
        } else if (instruction === "reset") {
            console.info("Clearing points system");
            initialise(true);
        }
        displayPoints(); // Need to display since it is async
    }

    $("#codeSubmit").click(function(e) {
        var code = $("[name='code']").val();
        console.log("Entered code:", code);
        if (code === ADMIN_CODE) {
            console.info("Displayed admin panel");
            eModal.prompt("Enter command", "Admin Panel")
            .then((cmd) => executeAdminCommand(cmd));
        } else if (code === CLAIM_CODE) {
            console.info("Claiming gift");
            if (getGiftClaimed()) {
                eModal.alert("Gift already claimed.", "Error!");
                return;
            }
            var maxIdx = -1;
            var points = getPoints();
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

    // Render
    initialise();
    render(decodeURI(window.location.hash) || "#home");
    displayPoints();
    displayConnectivity();
    $(window).on("online offline", displayConnectivity);
});