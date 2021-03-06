angular.module("App").controller("HostingOrderBandwidthCtrl", ($scope, $q, $window, $stateParams, HostingBandwidthOrder, Alerter) => {
    "use strict";

    $scope.loading = {
        init: true,
        duration: true,
        model: false,
        details: false,
        order: false
    };

    $scope.model = {
        offer: null,
        duration: null,
        contract: null
    };

    $scope.isOrderable = true;
    $scope.availableOffers = [];
    $scope.durations = [];
    $scope.details = {};

    $scope.loadOrder = function () {
        $scope.loading.init = true;
        HostingBandwidthOrder.getModels()
            .then(
                (models) => {
                    $scope.trafficEnum = _.sortBy(models.models["hosting.web.BandwidthOfferEnum"].enum, (d) => parseInt(d, 10));
                },
                (err) => {
                    Alerter.alertFromSWS($scope.tr("hosting_dashboard_bandwidth_order_error"), err, "hosting.alerts.dashboard");
                    $scope.resetAction();
                }
            )
            .finally(() => {
                $scope.loading.init = false;
            });
    };

    $scope.getDuration = function () {
        const queue = [];
        $scope.loading.duration = true;
        HostingBandwidthOrder.getDurations($stateParams.productId, { traffic: $scope.model.offer }).then(
            (durations) => {
                $scope.durations = durations;
                if ($scope.durations.length === 1) {
                    $scope.model.duration = $scope.durations[0];
                }
                $scope.loading.details = true;
                $scope.durations.forEach((duration) => {
                    queue.push(
                        HostingBandwidthOrder.getOrder($stateParams.productId, {
                            traffic: $scope.model.offer,
                            duration
                        }).then((details) => {
                            $scope.details[duration] = details;
                        })
                    );
                });
                $q.all(queue).then(() => {
                    $scope.loading.details = false;
                });
                $scope.loading.duration = false;
            },
            (err) => {
                Alerter.alertFromSWS($scope.tr("hosting_dashboard_bandwidth_order_error"), err, "hosting.alerts.dashboard");
                $scope.resetAction();
            }
        );
    };

    $scope.isStepValid = function (step) {
        switch (step) {
        case 1:
            return !$scope.loading.init && $scope.isOrderable && $scope.model.offer;
        case 2:
            return $scope.model.offer && $scope.model.duration && !$scope.loading.details;
        case 3:
            return $scope.model.offer && $scope.model.duration && $scope.model.contract;
        default:
            return null;
        }
    };

    $scope.makeOrder = function () {
        $scope.loading.order = true;
        HostingBandwidthOrder.order($stateParams.productId, {
            traffic: $scope.model.offer,
            duration: $scope.model.duration
        })
            .then(
                (order) => {
                    Alerter.success($scope.tr("hosting_dashboard_cdn_order_success", [order.url]), "hosting.alerts.dashboard");
                    $window.open(order.url, "_blank");
                },
                (data) => {
                    Alerter.alertFromSWS($scope.tr("hosting_dashboard_bandwidth_order_error"), data.data, "hosting.alerts.dashboard");
                }
            )
            .finally(() => {
                $scope.resetAction();
            });
    };
});
