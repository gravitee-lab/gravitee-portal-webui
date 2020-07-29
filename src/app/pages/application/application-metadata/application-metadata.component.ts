/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, OnInit } from '@angular/core';
import {
  Application,
  ApplicationService,
  PermissionsService,
  ReferenceMetadata,
  ReferenceMetadataFormatType
} from '@gravitee/ng-portal-webclient';
import { ActivatedRoute, Router } from '@angular/router';
import { marker as i18n } from '@biesbjerg/ngx-translate-extract-marker';
import { TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-application-metadata',
  templateUrl: './application-metadata.component.html',
  styleUrls: ['./application-metadata.component.css']
})
export class ApplicationMetadataComponent implements OnInit {

  constructor(
    private applicationService: ApplicationService,
    private formBuilder: FormBuilder,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationService: NotificationService,
    private permissionService: PermissionsService,
  ) {
    this.resetAddMetadata();
  }

  canCreate = false;
  canUpdate = false;
  application: Application;
  formats: Array<ReferenceMetadataFormatType>;
  metadata: Array<ReferenceMetadata>;
  metadataOptions: any;
  tableTranslations: any[];

  addMetadataForm: FormGroup;
  updateMetadataForm: FormGroup;

  metadataToUpdate: ReferenceMetadata;

  async ngOnInit() {
    this.application = this.route.snapshot.data.application;
    if (this.application) {

      await this.initPermissions();

      this.formats = Object.values(ReferenceMetadataFormatType);

      this.translateService.get([
        i18n('application.metadata.key'),
        i18n('application.metadata.name'),
        i18n('application.metadata.format'),
        i18n('application.metadata.value'),
        i18n('application.metadata.list.remove.message'),
        i18n('application.metadata.list.remove.title'),

      ])
        .toPromise()
        .then(translations => {
          this.tableTranslations = Object.values(translations);
          this.metadataOptions = this._buildMetadataOptions();

          this.loadMetadataTable();
        });
    }
  }

  _buildMetadataOptions() {
    const data: any[] = [];

    if (this.canCreate) {

    }
    if (this.canUpdate) {
      data.push({ field: 'key', label: this.tableTranslations[0] });
      data.push(this._renderName(this.tableTranslations[1]));
      data.push(this._renderFormat(this.tableTranslations[2]));
      data.push(this._renderValue(this.tableTranslations[3]));
      data.push(this._renderDelete(this.tableTranslations[4], this.tableTranslations[5]));
    } else {
      data.push({ field: 'key', label: this.tableTranslations[0] });
      data.push({ field: 'name', label: this.tableTranslations[1] });
      data.push({ field: 'format', label: this.tableTranslations[2] });
      data.push({ field: 'value', label: this.tableTranslations[3] });
    }

    return {
      paging: 10,
      data,
    };
  }

  _renderDelete(confirmMessage: any, iconTitle: any) {
    return {
      type: 'gv-icon',
      width: '25px',
      confirm: { msg: confirmMessage, danger: true },
      attributes: {
        onClick: (item) => this.removeMetadata(item),
        shape: 'general:trash',
        title: iconTitle,
      }
    };
  }

  _renderName(nameLabel: any) {
    return {
      field: 'name', label: nameLabel, type: 'gv-input',
    };
  }

  _renderFormat(formatLabel: any) {
    return {
      field: 'format', label: formatLabel, type: 'gv-select', format: (v: string) => v.toUpperCase(),
      attributes: {
        options: this.formats,
        'ongv-select:select': (item, e) => this.metadataOptions = this._buildMetadataOptions(),
      }
    };
  }

  _renderValue(valueLabel: any) {
    return {
      field: 'value',
      label: valueLabel,
      type:
        (item) => {
          switch (item.format) {
            case 'BOOLEAN':
              return 'gv-checkbox';
            case 'DATE':
              return 'gv-date-picker';
            default:
              return 'gv-input';
          }
        },
      attributes: {
        gvControl: true,
        'ongv-checkbox:input': (item, e) => this.updateMetadata(item, e),
        'ongv-input:input': (item, e) => this.updateMetadata(item, e),
        onInput: (item, e) => this.updateMetadata(item, e),
        options: this.formats,
        type: (item) => {
          switch (item.format) {
            case 'BOOLEAN':
            case 'DATE':
              return null;
            case 'MAIL':
              return 'email';
            case 'NUMERIC':
              return 'number';
            case 'STRING':
              return 'text';
            case 'URL':
              return 'url';
          }
        }
      }
    };
  }

  async initPermissions() {
    const permissions = await this.permissionService.getCurrentUserPermissions({ applicationId: this.application.id }).toPromise();

    if (permissions) {
      const metadataPermissions = permissions.METADATA;
      if (metadataPermissions && metadataPermissions.length > 0) {
        this.canCreate = metadataPermissions.includes('C');
        this.canUpdate = metadataPermissions.includes('U');
      }
    }
  }

  loadMetadataTable() {
    return this.applicationService.getMetadataByApplicationId({ applicationId: this.application.id }).toPromise()
      .then((metadataResponse) => {
        this.metadata = metadataResponse.data;
      });
  }

  resetAddMetadata() {
    this.addMetadataForm = this.formBuilder.group({
      name: new FormControl(null, Validators.required),
      format: new FormControl('STRING', Validators.required),
      value_STRING: null,
      value_NUMERIC: 0,
      value_MAIL: new FormControl(null, Validators.email),
      value_URL: new FormControl(null, Validators.pattern('(https?://.w*)(:\\d*)?\\/?(.*)')),
      value_BOOLEAN: false,
      value_DATE: null
    });
  }

  resetAddMetadataValue() {
    this.addMetadataForm.controls.value_STRING.setValue('');
    this.addMetadataForm.controls.value_NUMERIC.setValue(0);
    this.addMetadataForm.controls.value_MAIL.setValue('');
    this.addMetadataForm.controls.value_URL.setValue('');
    this.addMetadataForm.controls.value_BOOLEAN.setValue(false);
    this.addMetadataForm.controls.value_DATE.setValue('');
  }

  removeMetadata(metadata: ReferenceMetadata) {
    this.applicationService.deleteApplicationMetadata({
      applicationId: this.application.id,
      metadataId: metadata.key
    })
      .toPromise()
      .then(() => this.loadMetadataTable())
      .then(() => this.notificationService.success(i18n('application.metadata.list.remove.success')));
  }

  addMetadata() {
    this.applicationService.createApplicationMetadata({
      applicationId: this.application.id,
      ReferenceMetadataInput: {
        name: this.addMetadataForm.value.name,
        format: this.addMetadataForm.value.format,
        value: this.addMetadataForm.value.format === 'DATE' ?
          this.formatDate(this.addMetadataForm.value.value_DATE) :
          this.addMetadataForm.value['value_' + this.addMetadataForm.value.format]
      }
    }).toPromise().then(
      () => {
        this.notificationService.success(i18n('application.metadata.add.success'));
        this.loadMetadataTable();
        this.resetAddMetadata();
      }
    );
  }

  formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    return [year, month, day].join('-');
  }

  updateMetadata(metadata: ReferenceMetadata, { detail }) {
    this.applicationService.updateApplicationMetadataByApplicationIdAndMetadataId({
      applicationId: this.application.id,
      metadataId: this.metadataToUpdate.key,
      ReferenceMetadataInput: {
        name: this.updateMetadataForm.value.name,
        format: this.updateMetadataForm.value.format,
        value: this.updateMetadataForm.value.format === 'DATE' ?
          this.formatDate(this.updateMetadataForm.value.value_DATE) :
          this.updateMetadataForm.value['value_' + this.updateMetadataForm.value.format]
      }
    }).toPromise().then(() => {
      this.notificationService.success(i18n('application.metadata.update.success'));
      this.loadMetadataTable();
    });
  }
}
