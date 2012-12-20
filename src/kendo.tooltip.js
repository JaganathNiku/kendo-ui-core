kendo_module({
    id: "tooltip",
    name: "Tooltip",
    category: "web",
    description: "",
    depends: [ "core", "popup" ]
});

(function($, undefined) {
    var kendo = window.kendo,
        Widget = kendo.ui.Widget,
        Popup = kendo.ui.Popup,
        isFunction = $.isFunction,
        isPlainObject = $.isPlainObject,
        extend = $.extend,
        proxy = $.proxy,
        isLocalUrl = kendo.isLocalUrl,
        SHOW = "show",
        HIDE = "hide",
        ERROR = "error",
        CONTENTLOAD = "contentLoad",
        KCONTENTFRAME = "k-content-frame",
        TEMPLATE = '<div class="k-widget k-tooltip" style="margin-left:0.5em"><div class="k-tooltip-content"></div></div>',
        IFRAMETEMPLATE = kendo.template(
        "<iframe frameborder='0' class='" + KCONTENTFRAME + "' " +
                "src='#= content.url #'>" +
                    "This page requires frames in order to show content" +
        "</iframe>"),
        NS = ".kendoTooltip",
        POSITIONS = {
            "below": {
                origin: "bottom center",
                position: "top center"
            },
            "over": {
                origin: "top center",
                position: "bottom center"
            },
            "left": {
                origin: "center left",
                position: "center right",
                collision: "fit flip"
            },
            "right": {
                origin: "center right",
                position: "center left",
                collision: "fit flip"
            },
            "center": {
                position: "top center",
                origin: "center center"
            }
        };

    function restoreTitle(element) {
        while(element.length) {
            restoreTitleAttributeForElement(element);
            element = element.parent();
        }
    }

    function restoreTitleAttributeForElement(element) {
        var title = element.data(kendo.ns + "title");
        if (title) {
            element.attr("title", title);
            element.removeData(kendo.ns + "title");
        }
    }

    function saveTitleAttributeForElement(element) {
        var title = element.attr("title");
        if (title) {
            element.data(kendo.ns + "title", title);
            element.removeAttr("title");
        }
    }

    function saveTitleAttributes(element) {
        while(element.length) {
            saveTitleAttributeForElement(element);
            element = element.parent();
        }
    }

    var Tooltip = Widget.extend({
        init: function(element, options) {
            var that = this;

            Widget.fn.init.call(that, element, options);

            that.element
                .on("mouseenter" + NS, that.options.filter, proxy(that._mouseenter, that))
                .on("mouseleave" + NS, that.options.filter, proxy(that._mouseleave, that));
        },

        options: {
            name: "Tooltip",
            filter: "",
            content: ""
        },

        events: [ SHOW, HIDE, CONTENTLOAD, ERROR ],

        _mouseenter: function(e) {
            this.show($(e.currentTarget));
        },

        _appendContent: function(target) {
            var that = this,
                content = that.options.content,
                element = that.content,
                showIframe = that.options.showIframe,
                iframe;

            if (isPlainObject(content) && content.url) {
                if (!("showIframe" in that.options)) {
                    showIframe = !isLocalUrl(content.url);
                }

                if (!showIframe) {
                    kendo.ui.progress(element, true);
                    // perform AJAX request
                    that._ajaxRequest(content);
                } else {
                    iframe = element.find("." + KCONTENTFRAME)[0];

                    if (iframe) {
                        // refresh existing iframe
                        iframe.src = content.url || iframe.src;
                    } else {
                        element.html(IFRAMETEMPLATE({ content: content }));
                    }

                    element.find("." + KCONTENTFRAME)
                        .unbind("load" + NS)
                        .on("load" + NS, function(){
                            that.trigger(CONTENTLOAD);
                        });
                }
            } else if (content && isFunction(content)) {
                content = content({ element: target });
                that.content.html(content);
            } else {
                that.content.html(content);
            }
        },

        _ajaxRequest: function(options) {
            var that = this;

            jQuery.ajax(extend({
                type: "GET",
                dataType: "html",
                cache: false,
                error: function (xhr, status) {
                    kendo.ui.progress(that.content, false);

                    that.trigger(ERROR, { status: status, xhr: xhr });
                },
                success: proxy(function (data) {
                    kendo.ui.progress(that.content, false);

                    that.content.html(data);

                    that.trigger(CONTENTLOAD);
                }, that)
            }, options));
        },

        show: function(target) {
            var that = this,
                current = that.target();

            if (!that.popup) {
                that._initPopup();
            }

            if (current && current[0] != target[0]) {
                that.popup.close();
            }

            if (!current || current[0] != target[0]) {
                that._appendContent(target);

                that.popup.options.anchor = target;
            }

            saveTitleAttributes(target);

            that.popup.one("deactivate", function() {
                restoreTitle(target);
            });

            that.popup.open();
        },

        _initPopup: function() {
            var that = this,
                wrapper = $(kendo.template(TEMPLATE)({}));

            that.popup = new Popup(wrapper, extend({
                open: function() {
                    that.trigger(SHOW);
                },
                close: function() {
                    that.trigger(HIDE);
                }
            }, POSITIONS[that.options.position]));

            that.content = wrapper.find(".k-tooltip-content");

            wrapper.on("mouseleave" + NS, proxy(that._mouseleave, that));
        },

        _mouseleave: function(e) {
            var element = $(e.currentTarget),
                offset = element.offset(),
                pageX = e.pageX,
                pageY = e.pageY;

            offset.right = offset.left + element.outerWidth();
            offset.bottom = offset.top + element.outerHeight();

            if (pageX > offset.left && pageX < offset.right && pageY > offset.top && pageY < offset.bottom) {
                return;
            }

            this.popup.close();
        },

        target: function() {
            if (this.popup) {
                return this.popup.options.anchor;
            }
            return null;
        },

        destroy: function() {
            var popup = this.popup;

            if (popup) {
                popup.element.off(NS);
                popup.destroy();
            }

            this.element.off(NS);

            Widget.fn.destroy.call(this);
        }
    });

    kendo.ui.plugin(Tooltip);
})(window.kendo.jQuery);
