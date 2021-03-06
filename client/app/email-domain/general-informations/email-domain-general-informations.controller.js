angular.module("App").controller(
    "EmailTabGeneralInformationsCtrl",
    class EmailTabGeneralInformationsCtrl {
        /**
         * Constructor
         * @param $scope
         * @param $q
         * @param $stateParams
         * @param Alerter
         * @param Emails
         */
        constructor ($scope, $q, $stateParams, Alerter, Emails) {
            this.$scope = $scope;
            this.$q = $q;
            this.$stateParams = $stateParams;
            this.Alerter = Alerter;
            this.Emails = Emails;
        }

        $onInit () {
            this.loading = {
                domain: false,
                quotas: false
            };

            this.loadDomain();
            this.loadQuotas();
            this.Emails.getMxRecords(this.$stateParams.productId).then((data) => (this.mxRecords = data));
            this.Emails.getDnsFilter(this.$stateParams.productId).then((data) => (this.dnsFilter = data));
        }

        loadDomain () {
            this.loading.domain = true;

            this.Emails
                .getDomain(this.$stateParams.productId)
                .then((domain) => {
                    this.domain = domain;
                })
                .catch((err) => {
                    this.Alerter.alertFromSWS(this.$scope.tr("email_tab_table_accounts_error"), err, this.$scope.alerts.dashboard);
                })
                .finally(() => {
                    this.loading.domain = false;
                });
        }

        loadQuotas () {
            this.loading.quotas = true;
            this.$q
                .all({
                    quotas: this.Emails.getQuotas(this.$stateParams.productId),
                    summary: this.Emails.getSummary(this.$stateParams.productId)
                })
                .then(({ quotas, summary }) => {
                    this.quotas = quotas;
                    this.summary = summary;
                })
                .catch((err) => {
                    this.Alerter.alertFromSWS(this.$scope.tr("email_tab_table_accounts_error"), err, this.$scope.alerts.dashboard);
                })
                .finally(() => {
                    this.loading.quotas = false;
                });
        }
    }
);
