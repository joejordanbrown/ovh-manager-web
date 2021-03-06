angular.module("controllers").controller(
    "controllers.Domain.Dns.Lock",
    class DomainDnsLockCtrl {
        constructor ($scope, $rootScope, $stateParams, Alerter, Domain) {
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.$stateParams = $stateParams;
            this.Alerter = Alerter;
            this.Domain = Domain;
        }

        $onInit () {
            this.loading = false;
            this.$scope.updateDomainLock = () => this.updateDomainLock();
        }

        updateDomainLock () {
            this.loading = true;
            return this.Domain
                .updateNameServerType(this.$stateParams.productId, "hosted")
                .then(() => this.Alerter.success(this.$scope.i18n.domain_tab_DNS_lock_success, this.$scope.alerts.dashboard))
                .catch((err) => this.Alerter.alertFromSWS(this.$scope.i18n.domain_tab_DNS_lock_error, err, this.$scope.alerts.dashboard))
                .finally(() => {
                    this.$rootScope.$broadcast("Domain.Dns.Reload");
                    this.$scope.$emit("domain.dashboard.refresh");
                    this.loading = false;
                    this.$scope.resetAction();
                });
        }
    }
);
