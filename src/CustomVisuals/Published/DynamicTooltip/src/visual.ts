/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import tooltip = powerbi.extensibility.utils.tooltip;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export interface TooltipEventArgs<TData> {
        data: TData;
        coordinates: number[];
        elementCoordinates: number[];
        context: HTMLElement;
        isTouchEvent: boolean;
    }
    
    export module DataViewObjects {
        // Gets the value of the given object/property pair. */
        export function getValue<T>(objects: DataViewObjects, propertyId: DataViewObjectPropertyIdentifier, defaultValue?: T): T {

            if (!objects) {
                return defaultValue;
            }

            let objectOrMap: DataViewObject;
            objectOrMap = objects[propertyId.objectName];

            let object: DataViewObject;
            object = <DataViewObject>objectOrMap;

            return DataViewObject.getValue(object, propertyId.propertyName, defaultValue);
        }
    }

    export module DataViewObject {

        export function getValue<T>(object: DataViewObject, propertyName: string, defaultValue?: T): T {

            if (!object) {
                return defaultValue;
            }

            let propertyValue: T;
            propertyValue = <T>object[propertyName];
            if (propertyValue === undefined) {
                return defaultValue;
            }

            return propertyValue;
        }
    }

    export interface Itooltip {
        text: string;
        header: string;
        imageurl: string;
    }

    export interface ImeasureSettings {
        show: boolean;
        textPrecision: number;
        displayUnits: number;
    }

    export let visualProperties: {
        Itooltip: {
            text: DataViewObjectPropertyIdentifier;
            header: DataViewObjectPropertyIdentifier;
            imageurl: DataViewObjectPropertyIdentifier;
        };
        ImeasureSettings: {
            show: DataViewObjectPropertyIdentifier;
            textPrecision: DataViewObjectPropertyIdentifier;
            displayUnits: DataViewObjectPropertyIdentifier;
        };
    }
        = {
        Itooltip: {
            text: <DataViewObjectPropertyIdentifier>{ objectName: 'tooltip', propertyName: 'text' },
            header: <DataViewObjectPropertyIdentifier>{ objectName: 'tooltip', propertyName: 'header' },
            imageurl: <DataViewObjectPropertyIdentifier>{ objectName: 'tooltip', propertyName: 'imageurl' }
        },
        ImeasureSettings: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'measuretooltip', propertyName: 'show' },
            textPrecision: <DataViewObjectPropertyIdentifier>{ objectName: 'measuretooltip', propertyName: 'textPrecision' },
            displayUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'measuretooltip', propertyName: 'displayUnits' }
        }
    };

    export class Visual implements IVisual {

        private target: HTMLElement;
        private updateCount: number;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private host: IVisualHost;
        private root: d3.Selection<SVGElement>;
        private image: d3.Selection<SVGElement>;
        private tooltipText: string;
        private headerText: string;
        private header: string;
        private opacity: number;
        private dataViews: DataView;
        private events: IVisualEventService ;
        private imageurl: string;
        private showMeasure: boolean;
        private textPrecision: number;
        private displayUnits: number;
        private headerIndex: number;
        private measureIndex: number;
        

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.target = options.element;
            this.updateCount = 0;
            this.events = options.host.eventService;
            this.root = d3.select(options.element);
            this.imageurl = 'https://genericvisual.blob.core.windows.net/images/Tooltip.svg';
            this.image = this.root.append('div').classed('dynamicTooltip_div', true)
                .append('img').classed('dynamicTooltip_img', true)
                .attr('src', this.imageurl);
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            this.showMeasure = false;
            this.textPrecision = 0;
            this.displayUnits = 0;
        }
        public update(options: VisualUpdateOptions): void {
            this.events.renderingStarted(options);

            let textSetting: Itooltip;
            textSetting = this.getDefaultTextSettings();
            // tslint:disable-next-line:no-any
            let img: d3.Selection<any>;
            img = d3.select('img');

            let minVal: number;
            minVal = Math.min(options.viewport.width, options.viewport.height); // Take minimum value of width and height
            if (options.viewport.width > options.viewport.height) {
                $('.dynamicTooltip_div').addClass('dt_horizontallyCenter');
                $('.dynamicTooltip_img').removeClass('dt_verticallyCenter');
            } else if (options.viewport.width < options.viewport.height) {
                $('.dynamicTooltip_div').removeClass('dt_horizontallyCenter');
                $('.dynamicTooltip_img').addClass('dt_verticallyCenter');

                let topPx: number;
                topPx = options.viewport.height / 2 - minVal / 2;
                let topPos: string;
                topPos = topPx > 0 ? `${topPx}px` : '0px';
                this.image.style({
                    top: topPos
                });
            } else {
                $('.dynamicTooltip_div').removeClass('dt_horizontallyCenter');
                $('.dynamicTooltip_img').removeClass('dt_verticallyCenter');
            }

            this.image.style({
                width: `${minVal}px`,
                height: `${minVal}px`
            });

            let dataViews: DataView[];
            dataViews = options.dataViews;
            if (dataViews && dataViews[0] && dataViews[0].metadata) {
                let dataView: DataView;
                dataView = this.dataViews = options.dataViews[0];
                let imagePatt: RegExp;
                imagePatt = new RegExp('^https?://(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:/[^/#?]+)+\.(?:jpg|gif|png|svg)$');
                let validImage: boolean;
                let tooltipSettings: Itooltip;
                tooltipSettings = this.getToolTipSettings(dataView);
                let measureSettings: ImeasureSettings;
                measureSettings = this.getMeasureSettings(dataView);
                const values: DataViewValueColumns = options.dataViews[0].categorical.values;
                const iTotalColumns: number = values.length;
                let headerIndex: number;
                let measureIndex: number;
                this.index(iTotalColumns, values);
                headerIndex = this.headerIndex;
                measureIndex = this.measureIndex;
                if (measureSettings.show) {
                    if (dataViews[0].categorical && values && headerIndex > -1 && measureIndex > -1) {
                        this.headerData(values[headerIndex], tooltipSettings);
                        this.measuredata(values[measureIndex], tooltipSettings);
                    } else
                        if (values[0].source.roles.header) {
                            this.headerData(values[headerIndex], tooltipSettings);
                            this.tooltipText = '';
                        } else
                            if (values[0].source.roles.measure) {
                                this.measuredata(values[measureIndex], tooltipSettings);
                                this.headerText = ' ';

                            }
                } else {
                    this.tooltipText = tooltipSettings.text;
                    this.headerText = tooltipSettings.header;
                }
                validImage = imagePatt.test(tooltipSettings.imageurl);
                this.image = validImage ? img.attr('src', tooltipSettings.imageurl) : img.attr('src', textSetting.imageurl);
                let objects: DataViewObjects;
                objects = dataViews[0].metadata.objects;
            }
            if (this.tooltipText !== '' || this.header !== '' || this.headerText !== '') {
                this.tooltipServiceWrapper.addTooltip(this.root,
                                                      (tooltipEvent: TooltipEventArgs<number>) =>
                        this.getTooltipData(this.tooltipText, this.header, this.headerText),
                                                      (tooltipEvent: TooltipEventArgs<number>) => null);
            }
            this.events.renderingFinished(options);
        }
        public index(nColumns: number, values: DataViewValueColumns): void {
            const iTotalColumns: number = values.length;
            this.headerIndex = -1;
            this.measureIndex = -1;
            for (let iCount: number = 0; iCount < nColumns; iCount++) {
                if (values[iCount].source.roles.header) {
                    this.headerIndex = iCount;
                }
                if (values[iCount].source.roles.measure) {
                    this.measureIndex = iCount;
                }
            }
        }
        public headerData(values: DataViewValueColumn, tooltipSettings: Itooltip): void {
            let measureSettings: ImeasureSettings;
            measureSettings = this.getMeasureSettings(this.dataViews);
            this.headerText = values.values
                .toString() !== '' ? values.values.toString() : tooltipSettings.text;
            let decimalPlaces: number;

            decimalPlaces = measureSettings.textPrecision;

            let displayUnits: number;

            displayUnits = measureSettings.displayUnits;
            let formatter: utils.formatting.IValueFormatter;
            const number: PrimitiveValue = values.values[0];
            if (String((values.source.format)) === 'undefined' && typeof (number) === 'number') {
                values.source.format = valueFormatter.DefaultNumericFormat;
            }

            if ((String((values.source.format)) === 'undefined') ||
                (String((values.source.format)) === 'dd MMMM yyyy')) {
                formatter = valueFormatter.create({
                    format: values.source.format
                });
                let formatData: string;
                formatData = formatter.format(this.headerText);
                this.headerText = formatData;

            } else {
                let primaryFormatterVal: number = 0;
                // For display units auto
                if (displayUnits === 0) {
                    const alternateFormatter: number = parseInt(this.headerText.toString(), 10).toString().length;
                    if (alternateFormatter > 9) {
                        primaryFormatterVal = 1e9;
                    } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                        primaryFormatterVal = 1e6;
                    } else if (alternateFormatter <= 6 && alternateFormatter > 4) {
                        primaryFormatterVal = 1e3;
                    } else {
                        primaryFormatterVal = 10;
                    }
                } else {
                    primaryFormatterVal = displayUnits;
                }
                formatter = valueFormatter.create({
                    format: values.source.format ? values.source.format : valueFormatter.DefaultNumericFormat,
                    value: primaryFormatterVal,
                    precision: decimalPlaces
                });
                let formattedData: string;
                if (this.headerText !== tooltipSettings.text) {
                    // Converted to number for display units none
                    formattedData = formatter.format(Number(this.headerText));
                    this.headerText = formattedData;
                }
            }
        }
        public measuredata(values: DataViewValueColumn, tooltipSettings: Itooltip): void {
            let measureSettings: ImeasureSettings;
            measureSettings = this.getMeasureSettings(this.dataViews);
            this.tooltipText = values.values
                .toString() !== '' ? values.values.toString() : tooltipSettings.text;
            let decimalPlaces: number;

            decimalPlaces = measureSettings.textPrecision;

            let displayUnits: number;

            displayUnits = measureSettings.displayUnits;
            let formatter: utils.formatting.IValueFormatter;
            const number: PrimitiveValue = values.values[0];
            if (String((values.source.format)) === 'undefined' && typeof (number) === 'number') {
                values.source.format = valueFormatter.DefaultNumericFormat;
            }

            if ((String((values.source.format)) === 'undefined') ||
                (String((values.source.format)) === 'dd MMMM yyyy')) {
                formatter = valueFormatter.create({
                    format: values.source.format
                });
                let formatData: string;
                formatData = formatter.format(this.tooltipText);
                this.tooltipText = formatData;

            } else {
                let primaryFormatterVal: number = 0;
                // For display units auto
                if (displayUnits === 0) {
                    const alternateFormatter: number = parseInt(this.tooltipText.toString(), 10).toString().length;
                    if (alternateFormatter > 9) {
                        primaryFormatterVal = 1e9;
                    } else if (alternateFormatter <= 9 && alternateFormatter > 6) {
                        primaryFormatterVal = 1e6;
                    } else if (alternateFormatter <= 6 && alternateFormatter > 4) {
                        primaryFormatterVal = 1e3;
                    } else {
                        primaryFormatterVal = 10;
                    }
                } else {
                    primaryFormatterVal = displayUnits;
                }
                formatter = valueFormatter.create({
                    format: values.source.format ? values.source.format : valueFormatter.DefaultNumericFormat,
                    value: primaryFormatterVal,
                    precision: decimalPlaces
                });
                let formattedData: string;
                if (this.tooltipText !== tooltipSettings.text) {
                    // Converted to number for display units none
                    formattedData = formatter.format(Number(this.tooltipText));
                    this.tooltipText = formattedData;
                }
            }
        }
        public getDefaultTextSettings(): Itooltip {
            return {
                text: 'sample',
                header: 'text',
                imageurl: 'https://genericvisual.blob.core.windows.net/images/Tooltip.svg'
            };
        }
        public getToolTipSettings(dataView: DataView): Itooltip {
            let objects: DataViewObjects = null;
            let textSetting: Itooltip;
            textSetting = this.getDefaultTextSettings();

            if (!dataView.metadata || !dataView.metadata.objects) {
                return textSetting;
            }
            objects = dataView.metadata.objects;
            let textProperties: {
                Itooltip: {
                    text: DataViewObjectPropertyIdentifier;
                    header: DataViewObjectPropertyIdentifier;
                    imageurl: DataViewObjectPropertyIdentifier;
                };
                ImeasureSettings: {
                    show: DataViewObjectPropertyIdentifier;
                    textPrecision: DataViewObjectPropertyIdentifier;
                    displayUnits: DataViewObjectPropertyIdentifier;
                };
            };
            textProperties = visualProperties;
            textSetting.text = DataViewObjects.getValue(objects, textProperties.Itooltip.text, textSetting.text);
            textSetting.header = DataViewObjects.getValue(objects, textProperties.Itooltip.header, textSetting.header);
            textSetting.imageurl = DataViewObjects.getValue(objects, textProperties.Itooltip.imageurl, textSetting.imageurl);

            return textSetting;
        }

        public getDefaultMeasureSettings(): ImeasureSettings {
            return {
                show: false,
                textPrecision: 0,
                displayUnits: 0
            };
        }
        public getMeasureSettings(dataView: DataView): ImeasureSettings {
            let objects: DataViewObjects = null;
            let settings: ImeasureSettings;
            settings = this.getDefaultMeasureSettings();

            if (!dataView.metadata || !dataView.metadata.objects) {
                return settings;
            }

            objects = dataView.metadata.objects;
            let properties: {
                Itooltip: {
                    text: DataViewObjectPropertyIdentifier;
                    header: DataViewObjectPropertyIdentifier;
                    imageurl: DataViewObjectPropertyIdentifier;
                };
                ImeasureSettings: {
                    show: DataViewObjectPropertyIdentifier;
                    textPrecision: DataViewObjectPropertyIdentifier;
                    displayUnits: DataViewObjectPropertyIdentifier;
                };
            };
            properties
                = visualProperties;
            settings.show = DataViewObjects.getValue(objects, properties.ImeasureSettings.show, settings.show);
            settings.displayUnits = DataViewObjects.getValue(objects, properties.ImeasureSettings.displayUnits, settings.displayUnits);
            settings.textPrecision = DataViewObjects
                .getValue(objects, properties.ImeasureSettings.textPrecision, settings.textPrecision) > 4 ? 4 : (DataViewObjects
                    .getValue(objects, properties.ImeasureSettings.textPrecision, settings.textPrecision) < 0 ? 0 : (DataViewObjects
                        .getValue(objects, properties.ImeasureSettings.textPrecision, settings.textPrecision)));

            return settings;
        }
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let tooltipSetting: Itooltip;
            tooltipSetting = this.getToolTipSettings(this.dataViews);
            let measuredSettings: ImeasureSettings;
            measuredSettings = this.getMeasureSettings(this.dataViews);
            let objectName: string;
            objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[];
            objectEnumeration = [];

            switch (objectName) {
                case 'tooltip':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: 'Tooltip Settings',
                        properties: {
                            header: tooltipSetting.header,
                            text: tooltipSetting.text,
                            imageurl: tooltipSetting.imageurl
                        },
                        selector: null
                    });
                    break;
                case 'measuretooltip':
                    objectEnumeration.push({
                        objectName: objectName,
                        displayName: 'Measure Tooltip',
                        selector: null,
                        properties: {
                            show: measuredSettings.show,
                            textPrecision: measuredSettings.textPrecision,
                            displayUnits: measuredSettings.displayUnits
                        }
                    });
                    break;
                default:
                    break;
            }

            return objectEnumeration;
        }

        private getTooltipData(tooltip: string, header: string, headerText: string): VisualTooltipDataItem[] {
            if (tooltip === '' && header === '') {
                return null;
            }

            return [{
                displayName: '',
                value: tooltip,
                header: headerText
            }];
        }

    }
}
