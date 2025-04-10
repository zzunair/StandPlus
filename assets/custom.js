function QuickViewClick(event) {
    // console.log("quickview clicked:", event.target)
    const form = jQuery(event.target).parents('form');
    form.find('.product-collection__options').removeClass('d-none');
    form.find('.button-quick-view.js-popup-button').removeClass('d-flex');
    form.find('.button-quick-view.js-popup-button').addClass('d-none');
    form.find('.quick-view-close').removeClass('d-none');
    form.find('.quick-view-close').addClass('d-flex');
}

function QuickViewClose(event) {
    // console.log("quickview Close clicked:", event.target)
    const form = jQuery(event.target).parents('form');
    form.find('.product-collection__options').addClass('d-none');
    form.find('.button-quick-view.js-popup-button').addClass('d-flex');
    form.find('.button-quick-view.js-popup-button').removeClass('d-none');
    form.find('.quick-view-close').addClass('d-none');
    form.find('.quick-view-close').removeClass('d-flex');
}
(function () {
scrollLoad = function(){setTimeout( function(){
    if (jdgm && jdgm.customizeBadges) {
        jdgm.customizeBadges();
    }
  }, 500);}
document.addEventListener("scroll", scrollLoad);
})();

(function () {
    function DevThemeCheck() {
        if (document.body && window.Shopify?.theme?.name == "STAND WIP - Scott's Dev Branch") {
            window.dev_debug = true;
            const dev = document.body.appendChild(document.createElement("p"));
            console.log("dev theme:", Shopify.theme.name, window.dev_debug);
            dev.innerText = "Scott's DEV THEME";
            Object.assign(dev.style,{position: "fixed", top: "10px", right: "22px", color: "#ff0000c4", zIndex: 100, fontWeight: 600});
        };
    }
    function DevThemeCheckTimer() {
        if(document.body && window.Shopify?.theme?.name) DevThemeCheck()
        else setTimeout(DevThemeCheckTimer, 1000);  // keep trying until body is available
    };
    DevThemeCheckTimer();
})();