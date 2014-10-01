/*global angular, _eventPage, _i18n, _storage*/

/**
 * Controllers module
 * @type {ng.IModule}
 */
var popupControllers = angular.module('popupControllers', []);


// array this is something to do with minification
popupControllers.controller('DocumentsController', ["$scope", function ($scope) {
    'use strict';
    var backgroundPage;
    var activeTab;

    // models

//    $scope.docs = [];
//    $scope.match = "hello";

    /**
     * Ini
     * @param {object} _activeTab
     * @param {object} _backgroundPage
     */
    function onInit(_activeTab, _backgroundPage){
        activeTab = _activeTab;
        backgroundPage = _backgroundPage;

        _storage.getPopupHighlightTextMaxLength(function (max) {
            if (max) {
                $scope.popupHighlightTextMaxLength = max;
            }
        });

        // default to no clamp
//        chrome.storage.sync.get({
//            "highlightTextLineClamp": null
//        }, function (result) {
//            if (result) {
//                $scope.webkitLineClamp = (result.highlightTextLineClamp ?
//                    result.highlightTextLineClamp.toString() : null);
//            }
//        });

        $scope.title = activeTab.title;
        $scope.match = backgroundPage._database.buildMatchString(activeTab.url);

        updateDocs();
    }

    $scope.onClickMore = function (doc) {
        // TODO: shouldn't really be in the controller...
        $("#" + doc._id + " .highlight-text").text(doc.text);
    };

    /**
     * Click a highlight. Scroll to it in DOM
     * @param {object} doc
     */
    $scope.onClickHighlight = function (doc) {
        if (doc.isInDOM) {
            backgroundPage._eventPage.scrollTo(activeTab.id, doc._id);
        }
    };

    /**
     * Clicked 'select' button
     * @param {object} doc
     */
    $scope.onClickSelect = function (doc) {
        if (doc.isInDOM) {
            backgroundPage._eventPage.selectHighlightText(activeTab.id, doc._id);
            window.close();
        }
    };

    /**
     * Clicked 'copy' button for a highlight
     * @param documentId
     */
    $scope.onClickCopy = function (documentId) {
        backgroundPage._eventPage.copyHighlightText(documentId);
        window.close();
    };

    /**
     * Clicked 'speak' button for a highlight
     * @param documentId
     */
    $scope.onClickSpeak = function (documentId) {
        backgroundPage._eventPage.speakHighlightText(documentId);
    };

    /**
     * Clicked menu 'summary' button
     */
    $scope.onClickSummary = function () {
        // get the full uri for the tab. the summary page will get the match for it
        chrome.tabs.create({
            url: "summary.html?" +
                "id=" + activeTab.id + "&" +
                "url=" + encodeURIComponent(activeTab.url) + "&" +
                "title=" + encodeURIComponent($scope.title)
        });
    };

    /**
     * Clicked 'remove' button for a highlight
     * @param {string} documentId highlight id
     */
    $scope.onClickRemoveHighlight = function (documentId) {
        backgroundPage._eventPage.deleteHighlight(activeTab.id,  documentId, function (err, result) {
            if (result && result.ok ) {
                updateDocs(function (err, docs) {
                    // close popup on last doc removed
                    if (docs && docs.length === 0) {
                        window.close();
                    }
                });
            }
        });
    };

    /**
     * Clicked 'remove all' button
     */
    $scope.onClickRemoveAllHighlights = function () {
        if (window.confirm(chrome.i18n.getMessage("confirm_remove_all_highlights"))) {
            backgroundPage._eventPage.deleteHighlights(activeTab.id, $scope.match);
            window.close();
        }
    };

    /**
     * Clear and fill the 'docs' model
     * @param {function} [callback] function(err, docs)
     * @private
     */
    var updateDocs = function (callback) {
        // get all the documents (create & delete) associated with the match, then filter the deleted ones
        backgroundPage._database.getCreateDocuments($scope.match, function (err, docs) {
            if (!err) {
                $scope.docs = docs;
                $scope.$apply();

                // if the highlight cant be found in DOM, flag that
                docs.forEach(function (doc) {
                    // default to undefined, implying it IS in the DOM
                    backgroundPage._eventPage.isHighlightInDOM(activeTab.id, doc._id, function (isInDOM) {
                        //                    if (!isInDOM) {
                        //                        console.log("Not in DOM");
                        //                    }

                        doc.isInDOM = isInDOM;
                        $scope.$apply();
                    });
                });
            }

            if (callback) {
                callback(err, docs);
            }
        });
    };

    // starter
    chrome.tabs.query({ active: true, currentWindow: true }, function (result) {
        chrome.runtime.getBackgroundPage(function (backgroundPage) {
            onInit(result[0], backgroundPage);
        });
    });

}]);