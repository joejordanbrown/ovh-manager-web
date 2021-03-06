angular.module("App").controller("HostingDomainAttachCtrl", ($scope, $stateParams, $rootScope, Hosting, HostingDomain, Alerter, $q, Validator, COMPOSED_TLD) => {
    "use strict";

    $scope.model = {
        conflicts: null,
        domains: null,
        hosting: null,
        mode: {
            OVH: "OVH",
            EXTERNAL: "EXTERNAL"
        },
        domainsCount: $scope.currentActionData && $scope.currentActionData.domains ? $scope.currentActionData.domains.count : -1,
        options: null,
        step2Valid: null,
        token: null,
        tokenSubdomain: null
    };

    $scope.MAX_DOMAIN_LENGTH = Validator.MAX_DOMAIN_LENGTH;

    $scope.isStep1Valid = function () {
        if (!$scope.model.options) {
            return false;
        } else if ($scope.model.capabilities && $scope.model.domainsCount >= $scope.model.capabilities.attachedDomains) {
            return false;
        } else if (!$scope.selected.mode) {
            return false;
        } else if ($scope.selected.mode === $scope.model.mode.OVH) {
            return $scope.selected.baseDomain !== null;
        }
        return true;
    };

    $scope.selected = {
        autoconfigure: true,
        baseDomain: null,
        domain: $scope.currentActionData.subdomain || "",
        hosting: $scope.currentActionData ? $scope.currentActionData.hosting : null,
        domainWww: null,
        domainWwwNeeded: true,
        ipv6Needed: false,
        mode: $scope.model.mode.OVH,
        path: "",
        pathFinal: null,
        search: "",
        activeCDN: "NONE",
        countryIp: null,
        firewall: "NONE",
        ownLog: null,
        ssl: false
    };

    $scope.hosting = $scope.currentActionData ? $scope.currentActionData.hosting || $scope.hosting : $scope.hosting;

    $scope.selectedOptions = { value: "none" };

    $scope.loaders = {
        hosting: false,
        conflicts: false
    };

    const pattern = {
        domainWithSubdomain: /^(.*)\.([^\.]+\.[^\.]+)$/,
        domainWithoutSubdomain: /^([^\.]+\.[^\.]+)$/
    };

    $scope.getHostingIp = function (hosting, activeCDN, ipv6) {
        return hosting[(activeCDN === "ACTIVE" ? "hostingIp" : "clusterIp") + (ipv6 ? "v6" : "")];
    };

    $scope.isPathValid = function () {
        return Hosting.isPathValid($scope.selected.path);
    };

    $scope.getTokenDomain = function () {
        let result;
        if ($scope.model.tokenSubdomain && $scope.selected.domain) {
            result = $scope.model.tokenSubdomain;
            const subDomainPattern = $scope.selected.domain.match(pattern.domainWithSubdomain);
            if (subDomainPattern !== null) {
                result += `.${_.includes(COMPOSED_TLD, subDomainPattern[2]) ? $scope.selected.domain : subDomainPattern[2]}`;
            } else if ($scope.selected.domain.match(pattern.domainWithoutSubdomain) !== null) {
                result += `.${$scope.selected.domain}`;
            }
        }
        return result;
    };

    $scope.$watch("selected.domain", () => {
        if ($scope.selected.domain !== undefined && $scope.selected.domain !== null) {
            if ($scope.getSelectedDomainToDisplay().match(/^www\..*/)) {
                $scope.selected.domainWww = $scope.selected.domain;
            } else {
                $scope.selected.domainWww = `www.${$scope.selected.domain}`;
            }
        }
    });

    $scope.loadHosting = function () {
        let futuresOptions;
        let futureHosting;

        if ($scope.currentActionData && $scope.currentActionData.hosting) {
            $scope.selected.baseDomain = $scope.currentActionData.domain;
            $scope.model.domains = [];

            futuresOptions = HostingDomain.getAddDomainOptions($scope.currentActionData.hosting).then(
                (options) => {
                    $scope.model.options = options;
                },
                (error) => {
                    $scope.resetAction();
                    Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), error.data, $scope.alerts.dashboard);
                }
            );

            futureHosting = Hosting.getHosting($scope.currentActionData.hosting).then(
                (hosting) => {
                    $scope.model.hosting = hosting;
                    $scope.hosting = hosting;
                },
                (error) => {
                    $scope.resetAction();
                    Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), error.data, $scope.alerts.dashboard);
                }
            );
        } else {
            futuresOptions = HostingDomain.getAddDomainOptions().then(
                (options) => {
                    $scope.model.options = options;
                },
                (error) => {
                    $scope.resetAction();
                    Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), error.data, $scope.alerts.dashboard);
                }
            );

            futureHosting = Hosting.getSelected($stateParams.productId).then(
                (hosting) => {
                    $scope.model.hosting = hosting;
                },
                (error) => {
                    $scope.resetAction();
                    Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), error.data, $scope.alerts.dashboard);
                }
            );
        }

        $q
            .all([futuresOptions, futureHosting])
            .then(() => {
                const promises = [HostingDomain.getCapabilities($scope.hosting.offer)];

                if ($scope.model.domainsCount === -1) {
                    promises.push(HostingDomain.getAttachedDomains($scope.hosting.serviceName));
                }
                return $q.all(promises);
            })
            .then((resp) => {
                $scope.model.capabilities = resp[0];
                if (resp.length > 1) {
                    $scope.model.domainsCount = resp[1].length;
                }

                if ($scope.currentActionData && $scope.currentActionData.hosting) {
                    if ($scope.model.domainsCount < $scope.model.capabilities.attachedDomains) {
                        $scope.loadStep2();
                        $rootScope.$broadcast("wizard-goToStep", 3);
                    }
                } else {
                    angular.forEach($scope.model.options.availableDomains, (domain) => {
                        if (domain.name === $scope.model.hosting.serviceName) {
                            $scope.selected.baseDomain = domain;
                        }
                    });
                }
            })
            .catch((error) => {
                $scope.resetAction();
                Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), error, $scope.alerts.dashboard);
            });
    };

    $scope.getStep2View = function () {
        if ($scope.selected.mode) {
            return `hosting/multisite/add/${$scope.selected.mode.toLowerCase()}/hosting-multisite-add-${$scope.selected.mode.toLowerCase()}.html`;
        }
        return "";
    };

    const resultMessages = {
        OK: $scope.tr("hosting_tab_DOMAINS_configuration_add_success"),
        PARTIAL: $scope.tr("hosting_tab_DOMAINS_configuration_add_partial"),
        ERROR: $scope.tr("hosting_tab_DOMAINS_configuration_add_failure")
    };

    $scope.submit = function () {
        $scope.loading = true;
        $scope.resetAction();
        HostingDomain.addDomain(
            $scope.selected.mode === $scope.model.mode.OVH ? $scope.selected.baseDomain.name : $scope.selected.domain,
            $scope.selected.mode === $scope.model.mode.OVH ? $scope.selected.domain : null,
            $scope.selected.pathFinal,
            $scope.needWwwDomain(),
            $scope.selected.ipv6Needed,
            $scope.selected.autoconfigure && $scope.selected.mode === $scope.model.mode.OVH,
            $scope.selected.activeCDN,
            $scope.selected.countryIp ? $scope.selected.countryIp : null,
            $scope.selected.firewall,
            $scope.selected.ownLog === "ACTIVE" ? $scope.selected.ownLogDomain.name : null,
            $scope.selected.ssl,
            $scope.selected.hosting || $stateParams.productId
        )
            .then(
                (data) => {
                    Alerter.alertFromSWSBatchResult(resultMessages, data, $scope.alerts.dashboard);
                },
                (failure) => {
                    Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_failure"), { message: failure.data, type: "ERROR" }, $scope.alerts.dashboard);
                }
            )
            .finally(() => {
                $scope.loading = false;
            });
    };

    $scope.$watch("selected.mode", () => {
        if (!$scope.currentActionData || $scope.currentActionData.subdomain !== $scope.selected.domain) {
            $scope.selected.domain = "";
        }
    });

    $scope.loadStep2 = function () {
        const tokenNeeded = $scope.selected.mode === $scope.model.mode.EXTERNAL;
        HostingDomain.getExistingDomains($scope.selected.hosting || $stateParams.productId, tokenNeeded).then(
            (data) => {
                $scope.model.domains = data.existingDomains;
                $scope.model.token = data.token;
                $scope.model.tokenSubdomain = data.tokenSubdomain;
            },
            (failure) => {
                $scope.resetAction();
                Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), failure.data, $scope.alerts.dashboard);
            }
        );
    };

    $scope.domainsAlreadyExists = function (wwwNeeded) {
        if ($scope.model.domains && $scope.model.domains.indexOf($scope.getSelectedDomain(wwwNeeded)) !== -1) {
            return true;
        }
        return false;
    };

    $scope.domainIsNotValid = function () {
        if ($scope.selected.ssl) {
            return $scope.getSelectedDomain() ? !Validator.isValidDomain($scope.getSelectedDomain(), { canBeginWithWildcard: true }) : false;
        }
        return false;
    };

    $scope.domainContainsWildcard = function () {
        return $scope.getSelectedDomain() ? $scope.getSelectedDomain().indexOf("*") !== -1 : false;
    };

    $scope.getSelectedPath = function () {
        let home;
        if ($scope.selected.path !== null) {
            if (/^\/.*/.test($scope.selected.path) || /^\.\/.*/.test($scope.selected.path)) {
                home = $scope.selected.path;
            } else {
                home = `./${$scope.selected.path}`;
            }
        }
        return home;
    };

    $scope.loadStep3 = function () {
        $scope.model.conflicts = null;
        $scope.selected.pathFinal = $scope.getSelectedPath();
        if ($scope.selected.mode === $scope.model.mode.OVH) {
            $scope.loadingConflicts = true;
            HostingDomain.getExistingConfiguration($stateParams.productId, $scope.selected.baseDomain.name, $scope.selected.domain, $scope.needWwwDomain())
                .then(
                    (data) => {
                        if (data.length > 0) {
                            $scope.model.conflicts = data;
                        }
                    },
                    (failure) => {
                        $scope.resetAction();
                        Alerter.alertFromSWS($scope.tr("hosting_tab_DOMAINS_configuration_add_loading_error"), failure.data, $scope.alerts.dashboard);
                    }
                )
                .finally(() => {
                    $scope.loadingConflicts = false;
                });
        }
    };

    $scope.getSelectedDomainToDisplay = function (wwwNeeded) {
        let result = "";
        if (wwwNeeded) {
            result = $scope.selected.domainWww;
        } else {
            result = $scope.selected.domain;
        }

        if ($scope.selected.mode === $scope.model.mode.OVH && $scope.selected.baseDomain) {
            if ($scope.selected.domain && $scope.selected.domain.length > 0) {
                result += ".";
            }
            result += $scope.selected.baseDomain.displayName;
        }
        return result && result.toLowerCase();
    };

    $scope.getSelectedDomain = function (wwwNeeded) {
        let result = "";
        if (wwwNeeded) {
            result = $scope.selected.domainWww;
        } else {
            result = $scope.selected.domain;
        }

        if ($scope.selected.mode === $scope.model.mode.OVH && $scope.selected.baseDomain) {
            if ($scope.selected.domain && $scope.selected.domain.length > 0) {
                result += ".";
            }
            result += $scope.selected.baseDomain.name;
        }
        return result && result.toLowerCase();
    };

    $scope.needWwwDomain = function () {
        return !$scope.domainContainsWildcard() && $scope.selected.domainWwwNeeded && $scope.selected.domain !== $scope.selected.domainWww && !$scope.domainsAlreadyExists(true);
    };

    $scope.hasConflicts = function () {
        return $scope.model.conflicts && $scope.model.conflicts.length;
    };

    $scope.previousButtonHidden = function () {
        if ($scope.currentActionData && $scope.currentActionData.hosting && $scope.currentStep === 2) {
            return true;
        }

        return false;
    };
});
