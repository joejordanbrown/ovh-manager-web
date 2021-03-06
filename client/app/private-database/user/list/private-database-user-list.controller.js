angular.module("App").controller(
    "PrivateDatabaseUsersListCtrl",
    class PrivateDatabaseUsersListCtrl {
        constructor (Alerter, PrivateDatabase, $scope, $stateParams) {
            this.alerter = Alerter;
            this.privateDatabaseService = PrivateDatabase;
            this.$scope = $scope;
            this.$stateParams = $stateParams;
        }

        $onInit () {
            this.productId = this.$stateParams.productId;
            this.statusToWatch = ["start", "done", "error"];

            this.$scope.itemsPerPage = 10;

            this.currentUsers = {
                add: []
            };
            this.currentDellUser = null;

            this.alerts = {
                users: "privateDataBase.alerts.user"
            };

            this.loaders = {
                users: false
            };

            this.userDetails = [];

            this.getUsers();

            /*
             * Listners
             */
            _.forEach(this.statusToWatch, (state) => {
                this.$scope.$on(`privateDatabase.user.create.${state}`, this[`onUserCreate${state}`].bind(this));
                this.$scope.$on(`privateDatabase.user.delete.${state}`, this[`onUserDelete${state}`].bind(this));
                this.$scope.$on(`privateDatabase.user.changePassword.${state}`, this[`onUserChangePassword${state}`].bind(this));
            });

            _.forEach(["done", "error"], (state) => {
                this.$scope.$on(`privateDatabase.global.actions.${state}`, (e, taskOpt) => {
                    this.$scope.lockAction = taskOpt.lock ? false : this.$scope.lockAction;
                });
            });

            this.$scope.$on("privateDatabase.global.actions.start", (e, taskOpt) => {
                this.$scope.lockAction = taskOpt.lock || this.$scope.lockAction;
            });

            this.$scope.$on("$destroy", () => {
                this.privateDatabaseService.killPollUserGrant();
                this.privateDatabaseService.killPollUserDelete();
                this.privateDatabaseService.killPollUserCreate();
            });
        }

        getUsers () {
            this.loaders.users = true;
            this.usersIds = null;

            return this.privateDatabaseService
                .getUsers(this.productId)
                .then((users) => {
                    this.usersIds = users;
                })
                .catch((err) => {
                    this.alerter.error(err.message, this.alerts.users);
                })
                .finally(() => {
                    if (_.isEmpty(this.usersIds)) {
                        this.loaders.users = false;
                    }
                });
        }

        getUserDetails (id) {
            return this.privateDatabaseService.getUser(this.productId, id);
        }

        getPromise (promise) {
            promise.finally(() => {
                this.privateDatabaseService.restartPoll(this.productId, ["user/create", "user/delete", "user/changePassword"]);
            });
        }

        onTransformItemDone () {
            this.loaders.users = false;
        }

        /*
         * Create User jobs
         */
        onUserCreatestart (evt, opts) {
            this.currentUsers.add.push(opts.userName);
        }

        onUserCreatedone (evt, opts) {
            this.currentUsers.add = _.remove(this.currentUsers.add, (userName) => userName !== opts.userName);
            this.getUsers();
        }

        onUserCreateerror (evt, opts) {
            this.currentUsers.add = _.remove(this.currentUsers.add, (userName) => userName !== opts.userName);
            this.alerter.error(this.$scope.tr("privateDatabase_add_user_fail"), this.alerts.users);
        }

        /** EndCreateUserJobs*/

        /*
         * delete User jobs
         */
        onUserDeletestart (evt, opts) {
            let unregister = null;
            const todo = () => {
                const idx = _.findIndex(this.userDetails, (usr) => usr.userName === opts.userName);

                if (~idx) {
                    this.userDetails[idx].waitDelete = true;

                    if (unregister) {
                        unregister();
                    }
                }
            };

            if (this.userDetails && this.userDetails.length) {
                todo();
            } else {
                unregister = this.$scope.$watch(angular.bind(this, () => this.userDetails.length), todo);
            }
        }

        onUserDeletedone () {
            this.getUsers();
        }

        onUserDeleteerror (evt, opts) {
            let unregister = null;
            const todo = () => {
                const idx = _.findIndex(this.userDetails, (usr) => usr.userName === opts.userName);

                if (~idx) {
                    delete this.userDetails[idx].waiteDelete;

                    this.alerter.error(this.$scope.tr("privateDatabase_delete_user_fail"), this.alerts.users);

                    if (unregister) {
                        unregister();
                    }
                }
            };

            if (!_.isEmpty(this.userDetails)) {
                todo();
            } else {
                unregister = this.$scope.$watch(angular.bind(this, () => this.userDetails.length), todo);
            }
        }

        /** End deleteUserJobs*/

        onUserChangePasswordstart (evt, opts) {
            let unregister = null;
            const todo = () => {
                const idx = _.findIndex(this.userDetails, (usr) => usr.userName === opts.userName);

                if (~idx) {
                    this.userDetails[idx].waitChangePassword = true;

                    if (unregister) {
                        unregister();
                    }
                }
            };

            if (this.userDetails && this.userDetails.length) {
                todo();
            } else {
                unregister = this.$scope.$watch(angular.bind(this, () => this.userDetails.length), todo);
            }
        }

        onUserChangePassworddone (evt, opts) {
            let unregister = null;
            const todo = () => {
                const idx = _.findIndex(this.userDetails, (usr) => usr.userName === opts.userName);

                if (~idx) {
                    delete this.userDetails[idx].waitChangePassword;

                    this.alerter.success(this.$scope.tr("privateDatabase_change_userPassword_done"), this.alerts.users);

                    if (unregister) {
                        unregister();
                    }
                }
            };

            if (this.userDetails && this.userDetails.length) {
                todo();
            } else {
                unregister = this.$scope.$watch("userDetails.length", todo);
            }
        }

        onUserChangePassworderror (evt, opts) {
            let unregister = null;
            const todo = () => {
                const idx = _.findIndex(this.userDetails, (usr) => usr.userName === opts.userName);

                if (~idx) {
                    delete this.userDetails[idx].waitChangePassword;

                    this.alerter.error(this.$scope.tr("privateDatabase_change_userPassword_fail"), this.alerts.users);

                    if (unregister) {
                        unregister();
                    }
                }
            };

            if (this.userDetails && this.userDetails.length) {
                todo();
            } else {
                unregister = this.$scope.$watch(angular.bind(this, () => this.userDetails.length), todo);
            }
        }

        restardPoll () {
            this.privateDatabaseService.restartPoll(this.productId, ["user/create", "user/delete", "user/changePassword"]);
        }
    }
);
