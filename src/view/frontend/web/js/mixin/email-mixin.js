/**
 * Copyright © 2018 Rubic. All rights reserved.
 * See LICENSE.txt for license details.
 */
define([
    'jquery',
    'Magento_Checkout/js/model/step-navigator',
    'Magento_Customer/js/action/check-email-availability',
    'Magento_Checkout/js/checkout-data',
    'Magento_Checkout/js/model/quote',
    'Magento_Customer/js/model/customer',
    'Magento_Customer/js/action/login',
    'mage/url',
    'Magento_Checkout/js/model/full-screen-loader'
], function (
    $,
    stepNavigator,
    checkEmailAvailability,
    checkoutData,
    quote,
    customer,
    loginAction,
    urlBuilder,
    fullScreenLoader
) {
    'use strict';

    return function (target) {
        return target.extend({
            defaults: {
                listens: {
                    email: ''
                }
            },

            /**
             * Reduce form delay when checking if entered email already exists.
             */
            initialize: function () {
                this.checkDelay = 500;
                return this._super();
            },

            /**
             * Initializes observable properties of instance
             *
             * @returns {Object} Chainable.
             */
            initObservable: function () {
                this._super()
                    .observe([
                        'isEmailInputEnabled',
                        'isRegisterButtonVisible',
                        'isGuestButtonVisible',
                        'isNextButtonVisible',
                        'isEmailInvalid'
                    ]);

                this.isEmailInputEnabled(!customer.isLoggedIn());
                this.isEmailInvalid(false);

                if (customer.isLoggedIn() && window.customerData.email) {
                    this.email(window.customerData.email);
                }

                //this.email.subscribe(this.emailAddressChanged, this);
                // this.isPasswordVisible.subscribe(this.haveAccountChanged, this);
                this.isNextButtonVisible(this.isPasswordVisible() === false);
                return this;
            },

            login: function (loginForm) {
                var loginData = {},
                    formDataArray = $(loginForm).serializeArray();

                formDataArray.forEach(function (entry) {
                    loginData[entry.name] = entry.value;
                });

                if (this.isPasswordVisible() && $(loginForm).validation() && $(loginForm).validation('isValid')) {
                    fullScreenLoader.startLoader();
                    loginAction(loginData, window.checkoutConfig.checkoutUrl).always(function () {
                        fullScreenLoader.stopLoader();
                    });
                }
            },

            nextAction: function () {

                if (customer.isLoggedIn()) {
                    stepNavigator.next();
                    return;
                }

                if (this.validateEmail()) {
                    this.checkEmailAvailability();
                    quote.guestEmail = this.email();
                    checkoutData.setValidatedEmailValue(this.email());
                    checkoutData.setInputFieldEmailValue(this.email());
                } else {
                    this.isEmailInvalid(false);
                    this.isEmailInvalid(true);
                    this.updateButtons();
                }
            },

            proceedToRegistration: function() {
                window.location.href = urlBuilder.build('customer/account/create');
            },

            checkEmailAvailability: function () {
                this.validateRequest();
                this.isEmailCheckComplete = $.Deferred();
                this.isLoading(true);
                this.checkRequest = checkEmailAvailability(this.isEmailCheckComplete, this.email());

                $.when(this.isEmailCheckComplete).done(function () {
                    this.isPasswordVisible(false);
                    this.updateButtons();
                }.bind(this)).fail(function () {
                    this.isPasswordVisible(true);
                    this.updateButtons();
                    checkoutData.setCheckedEmailValue(this.email());
                }.bind(this)).always(function () {
                    this.isLoading(false);
                }.bind(this));
            },

            continueAsGuest: function () {
                stepNavigator.next();
            },

            allowEmailInput: function () {
                if (customer.isLoggedIn()) {
                    window.location.href = urlBuilder.build('customer/account/logout');
                    return;
                }
                this.isEmailInputEnabled(true);
                this.isPasswordVisible(false);
                this.isNextButtonVisible(true);
                this.isRegisterButtonVisible(false);
                this.isGuestButtonVisible(false);
            },

            updateButtons: function () {
                if (this.validateEmail()) {
                    this.isEmailInputEnabled(false);
                    this.isNextButtonVisible(false);
                    this.isRegisterButtonVisible(true);
                    this.isGuestButtonVisible(true);
                } else {
                    this.isEmailInputEnabled(true);
                    this.isNextButtonVisible(true);
                    this.isRegisterButtonVisible(false);
                    this.isGuestButtonVisible(false);
                    return;
                }

                if (this.isPasswordVisible()) {
                    this.isEmailInputEnabled(false);
                    this.isNextButtonVisible(false);
                    this.isRegisterButtonVisible(false);
                    this.isGuestButtonVisible(false);
                    return;
                }
            }

        });
    }
});
