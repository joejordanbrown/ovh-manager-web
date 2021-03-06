angular.module("App").controller(
    "DomainOperationCtrl",
    class DomainOperationCtrl {
        /**
         * Constructor
         * @param $scope
         * @param $location
         * @param $timeout
         * @param Alerter
         * @param domainOperationService
         */
        constructor ($scope, $location, $timeout, Alerter, domainOperationService) {
            this.$scope = $scope;
            this.$location = $location;
            this.$timeout = $timeout;
            this.Alerter = Alerter;
            this.Operation = domainOperationService;
        }

        $onInit () {
            this.filters = {
                nicOperation: null,
                operationStatus: null
            };
            this.loading = {
                filters: true,
                init: false
            };
            this.stepPath = "";

            this.$scope.alerts = { dashboard: "domains.operations.alerts" };
            this.$scope.resetAction = () => this.$scope.setAction(false);
            this.$scope.setAction = (action, data) => {
                this.$scope.currentAction = action;
                this.$scope.currentActionData = data;

                if (action) {
                    this.stepPath = `${this.$scope.currentAction}.html`;
                    $("#currentAction").modal({
                        keyboard: true,
                        backdrop: "static"
                    });
                } else {
                    $("#currentAction").modal("hide");
                    this.$scope.currentActionData = null;
                    this.$timeout(() => {
                        this.stepPath = "";
                    }, 300);
                }
            };

            this.$scope.$on("domains.operations.relaunched", this.getOperationIds);
            this.$scope.$on("$locationChangeStart", () => {
                this.$scope.resetAction();
            });

            this.getModels()
                .then(() => {
                    const fnFilter = this.$location.search().function;
                    if (_.some(this.nicOperationEnum, fnFilter)) {
                        this.filters.nicOperation = fnFilter;
                    }
                })
                .finally(() => (this.loading.filters = false));

            this.getOperationIds();
        }

        getModels () {
            return this.Operation
                .getOperationModels()
                .then((models) => {
                    this.nicOperationEnum = models.models["domain.NicOperationFunctionEnum"].enum;
                    this.operationStatusEnum = models.models["domain.OperationStatusEnum"].enum;
                })
                .catch((err) => this.Alerter.alertFromSWS("", err, this.$scope.alerts.dashboard));
        }

        resetSearch () {
            this.filters.domain = "";
            this.getOperationIds();
        }

        getOperationIds () {
            this.loading.init = true;
            this.operationIds = null;

            return this.Operation
                .getOperations({
                    "function": this.filters.nicOperation || undefined,
                    status: this.filters.operationStatus || undefined,
                    domain: `%${this.filters.domain || ""}%`
                })
                .then((operationIds) => (this.operationIds = operationIds))
                .catch((err) => {
                    _.set(err, "type", err.type || "ERROR");
                    this.Alerter.alertFromSWS(this.$scope.tr("domains_operations_error"), err, this.$scope.alerts.dashboard);
                })
                .finally(() => {
                    if (_.isEmpty(this.operationIds)) {
                        this.loading.init = false;
                    }
                });
        }

        transformItem (id) {
            return this.Operation.getOperation(id);
        }

        onTransformItemDone () {
            this.loading.init = false;
        }
    }
);
