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

    /* Code Page */
    var CODES = [ /* For testing purposes */
        {desc: "IRS", code: "420blazeit", message: "What a dank memer!", id: 0}
    ];

    function getEnteredCodes() {
        var codes = localStorage.getItem("enteredCodes");
        if (!codes) return [];
        return JSON.parse(localStorage.getItem("enteredCodes"));
    }

    function checkCode(code) {
        // Check if the code exists
        var idx = -1;
        CODES.forEach(function(e, i) {
            if (e.code === code) idx = i;
        });
        if (idx === -1) {
            eModal.alert("Invalid Code!", "Error");
            return;
        }
        // Check if it was already entered
        var codes = getEnteredCodes();
        if (~ codes.indexOf(CODES[idx].id)) {
            eModal.alert("Code was already entered!", "Error");
            return;
        }
        // Valid
        addCode(CODES[idx].id);
        eModal.alert(CODES[idx].message, CODES[idx].desc);
    }

    function addCode(id) {
        var codes = getEnteredCodes();
        codes.push(id);
        localStorage.setItem("enteredCodes", JSON.stringify(codes));
    }

    function updatePoints() {
        var codes = getEnteredCodes();
        var points = codes.length;
        $("#codeCount").text(points);
        $("#codeTiers tr").each(function(i, e) {
            var $e = $(e);
            if (parseInt($e.data("points")) <= points) {
                $e.attr("class", "success");
            } else {
                $e.attr("class", "danger");
            }
        })
    }

    $("#codeSubmit").click(function(e) {
        var $code = $("[name='code']");
        var code = $code.val();
        console.log("Entered code:", code);
        checkCode(code);
        updatePoints();
    });

    // Render
    render(decodeURI(window.location.hash) || "#home");
    updatePoints();
});