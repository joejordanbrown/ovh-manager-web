angular
    .module("App")
    .controller("PrivateDatabaseStartCtrl", class PrivateDatabaseStartCtrl {

        constructor ($scope, $stateParams, Alerter, PrivateDatabase) {
            this.$scope = $scope;
            this.$stateParams = $stateParams;
            this.alerter = Alerter;
            this.privateDatabaseService = PrivateDatabase;
        }

        $onInit () {
            this.productId = this.$stateParams.productId;

            this.$scope.startDatabase = () => this.startDatabase();
        }

        startDatabase () {
            this.$scope.resetAction();
            this.privateDatabaseService.startDatabase(this.productId)
                .then((task) => {
                    this.$scope.pollAction(task);
                    this.alerter.success(this.$scope.tr("privateDatabase_start_success"), this.$scope.alerts.dashboard);
                })
                .catch((data) => {
                    this.alerter.alertFromSWS(this.$scope.tr("privateDatabase_start_fail"), data.data, this.$scope.alerts.dashboard);
                });
        }
});
