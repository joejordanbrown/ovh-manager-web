angular.module("App").controller("HostingCronCreateCtrl", ($scope, $stateParams, Alerter, translator, Hosting, HostingCron, CronValidator) => {
    "use strict";

    const actionData = angular.copy($scope.currentActionData); // For edition

    $scope.loading = {
        init: false
    };

    $scope.model = {
        emailSelect: "no",
        status: "disabled"
    };

    // Object used to communicate with the cronEditor directive. See definition in cronEditor.controller.js.
    $scope.crontabObject = CronValidator.makeCrontabObject();

    $scope.isPathValid = function () {
        return Hosting.isPathValid($scope.selected.command);
    };

    $scope.isValid = function (step) {
        switch (step) {
        case 1:
            return $scope.selected.command && $scope.getSelectedCommand().length <= 100 && $scope.isPathValid() && $scope.model.language && ($scope.model.emailSelect === "other" ? $scope.model.email : true);
        case 2:
            return $scope.crontabObject.isValid && $scope.crontabObject.isValid();
        default:
            return null;
        }
    };

    /*= =========  Final step  ==========*/

    $scope.selected = {
        command: null
    };

    $scope.getSelectedCommand = function () {
        let home;
        if ($scope.selected.command !== null) {
            if (/^\/.*/.test($scope.selected.command) || /^\.\/.*/.test($scope.selected.command)) {
                home = $scope.selected.command;
            } else {
                home = `./${$scope.selected.command}`;
            }
        }
        return home;
    };

    $scope.generateCron = function () {
        $scope.model.command = $scope.getSelectedCommand();
        $scope.model.frequency = $scope.crontabObject.getCrontab();
    };

    $scope.getEmailResume = function () {
        return $scope.model.emailSelect === "other" ? $scope.model.email : $scope.model.emailSelect;
    };

    $scope.saveCron = function () {
        $scope.loading.validation = true;

        // Set email value
        if ($scope.model.emailSelect !== "other") {
            $scope.model.email = $scope.model.emailSelect;
        }

        // Add or Edit
        if (actionData.cron) {
            HostingCron.editCron($stateParams.productId, actionData.cron.id, $scope.model).then(
                () => {
                    Alerter.alertFromSWS(translator.tr("hosting_tab_CRON_edit_success"), { idTask: 42, state: "OK" }, $scope.alerts.dashboard);
                    $scope.resetAction();
                },
                (data) => {
                    Alerter.alertFromSWS(translator.tr("hosting_tab_CRON_edit_error", [actionData.cron.id]), data.data, $scope.alerts.dashboard);
                    $scope.resetAction();
                }
            );
        } else {
            HostingCron.createCron($stateParams.productId, $scope.model).then(
                () => {
                    Alerter.alertFromSWS(translator.tr("hosting_tab_CRON_save_success"), { idTask: 42, state: "OK" }, $scope.alerts.dashboard);
                    $scope.resetAction();
                },
                (data) => {
                    Alerter.alertFromSWS(translator.tr("hosting_tab_CRON_save_error"), data.data, $scope.alerts.dashboard);
                    $scope.resetAction();
                }
            );
        }
    };

    $scope.trEnum = function (str) {
        return HostingCron.trEnum(str);
    };

    /*= =========  INIT  ==========*/

    $scope.init = function () {
        $scope.loading.init = true;
        $scope.title = actionData.cron ? translator.tr("hosting_tab_CRON_configuration_edit_title_button") : translator.tr("hosting_tab_CRON_configuration_create_title_button");

        // Edition
        if (actionData.cron) {
            $scope.selected.command = actionData.cron.command.replace(/^\.\//, "");
            $scope.model.language = actionData.cron.language;
            $scope.model.description = actionData.cron.description;
            $scope.model.status = actionData.cron.status;
            switch (actionData.cron.email) {
            case "no":
            case "nic-admin":
            case "nic-tech":
                $scope.model.emailSelect = actionData.cron.email;
                break;
            default:
                $scope.model.emailSelect = "other";
                $scope.model.email = actionData.cron.email;
            }

            $scope.crontabObject.setCrontab(actionData.cron.frequency);
        }

        Hosting.getModels()
            .then(
                (models) => {
                    $scope.statusEnum = models.models["hosting.web.cron.StatusEnum"].enum;
                },
                (err) => {
                    Alerter.alertFromSWS($scope.tr("hosting_tab_CRON_error"), err.data, $scope.alerts.dashboard);
                    $scope.resetAction();
                }
            )
            .finally(() => {
                $scope.loading.init = false;
            });

        HostingCron.getAvailableLanguage($stateParams.productId).then(
            (languages) => {
                $scope.languageEnum = languages.reverse();
            },
            (err) => {
                Alerter.alertFromSWS($scope.tr("hosting_tab_CRON_error"), err, $scope.alerts.dashboard);
                $scope.resetAction();
            }
        );
    };
});
