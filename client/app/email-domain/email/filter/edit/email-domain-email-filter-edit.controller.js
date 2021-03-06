angular.module("App").controller(
    "EmailsEditFilterCtrl",
    class EmailsEditFilterCtrl {
        constructor ($scope, $stateParams, Alerter, Emails) {
            this.$scope = $scope;
            this.$stateParams = $stateParams;
            this.Alerter = Alerter;
            this.Emails = Emails;
        }

        $onInit () {
            this.account = angular.copy(this.$scope.currentActionData.account);
            this.accounts = _.map(this.$scope.currentActionData.accounts, (account) => `${account}@${this.account.domain}`);
            this.filter = angular.copy(this.$scope.currentActionData.filter);
            this.headers = ["From", "To", "Subject", "other"];
            this.loading = false;

            this.getModels();

            this.$scope.updateFilter = () => this.updateFilter();
        }

        getModels () {
            this.loading = true;
            this.Emails
                .getModels()
                .then((models) => {
                    this.actions = models.models["domain.DomainFilterActionEnum"].enum;
                    this.operands = models.models["domain.DomainFilterOperandEnum"].enum;

                    if (_.get(this.$scope.currentActionData, "delegate", false)) {
                        return this.Emails.getDelegatedRules(this.account.email, this.filter.name);
                    }
                    return this.Emails.getRules(this.$stateParams.productId, this.account.accountName, this.filter.name);
                })
                .catch(() => {
                    this.actions = [];
                    this.operands = [];
                })
                .then((rules) => {
                    if (rules != null) {
                        this.filter.rules = rules.map((rule) => {
                            const matchingHeader = this.headers.find((header) => header === rule.header);

                            if (matchingHeader == null) {
                                rule.headerSelect = "other";
                            } else {
                                rule.headerSelect = rule.header;
                            }

                            return rule;
                        });
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        }

        addRule () {
            this.filter.rules.push({ header: "", operand: "", value: "", headerSelect: "" });
        }

        removeRule (rule) {
            this.filter.rules.splice(this.filter.rules.indexOf(rule), 1);
        }

        filterActionRedirectCheck () {
            const input = this.editFilterForm.filterActionParam;
            const value = input.$viewValue;
            input.$setValidity("filterActionRedirect", !!value && /^[A-Za-z0-9._\-\+]+@[A-Za-z0-9.\-_]+\.[A-Za-z]{2,}$/.test(value) && !/^\./.test(value));
        }

        filterPriorityCheck () {
            const input = this.editFilterForm.filterPriority;
            const value = input.$viewValue;
            input.$setValidity("filterPriority", !!value && /^[0-9]+$/.test(value));
        }

        filterRuleCheck () {
            return _.every(this.filter.rules, (rule) => rule.value && rule.operand && ((rule.headerSelect && rule.headerSelect !== "other") || (rule.headerSelect === "other" && rule.header)));
        }

        updateFilter () {
            this.loading = true;
            const rules = _.map(_.filter(this.filter.rules, (rule) => (rule.headerSelect !== "" || rule.header !== "") && rule.operand !== "" && rule.value !== ""), (rule) => ({
                operand: rule.operand,
                value: rule.value,
                header: rule.headerSelect === "other" ? rule.header : rule.headerSelect
            }));
            const rule = rules.shift();

            const filter = this.filter;
            delete filter.rules;
            delete filter.domain;
            delete filter.pop;
            filter.header = rule.header;
            filter.operand = rule.operand;
            filter.value = rule.value;

            let filterPromise;
            if (_.get(this.$scope.currentActionData, "delegate", false)) {
                filterPromise = this.Emails.updateDelegatedFilter(this.account.email, filter, rules);
            } else {
                filterPromise = this.Emails.updateFilter(this.$stateParams.productId, this.account.accountName, filter, rules);
            }

            return filterPromise
                .then(() => this.Alerter.success(this.$scope.tr("email_tab_modal_edit_filter_success"), this.$scope.alerts.dashboard))
                .catch((err) => this.Alerter.alertFromSWS(this.$scope.tr("email_tab_modal_edit_filter_error"), _.get(err, "data", err), this.$scope.alerts.dashboard))
                .finally(() => {
                    this.loading = false;
                    this.$scope.resetAction();
                });
        }
    }
);
