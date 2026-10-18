# Public constrained parts API

Generated for `pith-ui@0.7.1` by `node scripts/api-docs.ts` from TypeScript declaration emit. Installed declarations are authoritative. This reference covers 137 public factories and all reachable state, options, callbacks and opaque handles.

Only names in the public index may be imported from `pith-ui`. The package also exports `pith-ui/styles.css`. Parts accept literal content, finite semantic options, state and data callbacks; they expose no DOM, CSS, pixel or animation ports. `mountParts` is the sole ordinary-container boundary. See [AI.md](./AI.md), the [assembly guide](./APP.md) and [shared recipes](./docs/assemblies/coverage.md).

Source links use the exact package version tag. Before release, this source reference can differ from an already-published package.

Regenerate: `node scripts/api-docs.ts`. Verify without writing: `node scripts/api-docs.ts --check`.

## Factory index

| Factory | Part specification and interaction |
|---|---|
| [`createActionsPart`](#createactionspart) | [actions-part](https://minifish-org.github.io/pith-ui/?item=actions-part) |
| [`createActivityPart`](#createactivitypart) | [activity-part](https://minifish-org.github.io/pith-ui/?item=activity-part) |
| [`createAnchoredGroupPart`](#createanchoredgrouppart) | [anchored-group-part](https://minifish-org.github.io/pith-ui/?item=anchored-group-part) |
| [`createAnnouncementPart`](#createannouncementpart) | [announcement-part](https://minifish-org.github.io/pith-ui/?item=announcement-part) |
| [`createBadgePart`](#createbadgepart) | [badge-part](https://minifish-org.github.io/pith-ui/?item=badge-part) |
| [`createBrandMarkPart`](#createbrandmarkpart) | [brand-mark-part](https://minifish-org.github.io/pith-ui/?item=brand-mark-part) |
| [`createBrandPart`](#createbrandpart) | [brand-part](https://minifish-org.github.io/pith-ui/?item=brand-part) |
| [`createBrandTilePart`](#createbrandtilepart) | [brand-tile-part](https://minifish-org.github.io/pith-ui/?item=brand-tile-part) |
| [`createBreadcrumbPart`](#createbreadcrumbpart) | [breadcrumb-part](https://minifish-org.github.io/pith-ui/?item=breadcrumb-part) |
| [`createBubblePart`](#createbubblepart) | [bubble-part](https://minifish-org.github.io/pith-ui/?item=bubble-part) |
| [`createButtonPart`](#createbuttonpart) | [button-parts](https://minifish-org.github.io/pith-ui/?item=button-parts) |
| [`createCalloutActionsPart`](#createcalloutactionspart) | [callout-actions-part](https://minifish-org.github.io/pith-ui/?item=callout-actions-part) |
| [`createCalloutHeadingPart`](#createcalloutheadingpart) | [callout-heading-part](https://minifish-org.github.io/pith-ui/?item=callout-heading-part) |
| [`createCalloutPart`](#createcalloutpart) | [callout-part](https://minifish-org.github.io/pith-ui/?item=callout-part) |
| [`createCaptionPart`](#createcaptionpart) | [caption-part](https://minifish-org.github.io/pith-ui/?item=caption-part) |
| [`createCardBodyPart`](#createcardbodypart) | [card-body-part](https://minifish-org.github.io/pith-ui/?item=card-body-part) |
| [`createCardHeadingPart`](#createcardheadingpart) | [card-heading-part](https://minifish-org.github.io/pith-ui/?item=card-heading-part) |
| [`createCardPart`](#createcardpart) | [card-part](https://minifish-org.github.io/pith-ui/?item=card-part) |
| [`createCenteredContentPart`](#createcenteredcontentpart) | [centered-content-part](https://minifish-org.github.io/pith-ui/?item=centered-content-part) |
| [`createCheckboxPart`](#createcheckboxpart) | [checkbox-part](https://minifish-org.github.io/pith-ui/?item=checkbox-part) |
| [`createChoiceListPart`](#createchoicelistpart) | [choice-list-part](https://minifish-org.github.io/pith-ui/?item=choice-list-part) |
| [`createCodePropertyPart`](#createcodepropertypart) | [code-property-part](https://minifish-org.github.io/pith-ui/?item=code-property-part) |
| [`createCompactActionsPart`](#createcompactactionspart) | [compact-actions-part](https://minifish-org.github.io/pith-ui/?item=compact-actions-part) |
| [`createCompactRowActionsPart`](#createcompactrowactionspart) | [compact-row-actions-part](https://minifish-org.github.io/pith-ui/?item=compact-row-actions-part) |
| [`createCompactRowBodyPart`](#createcompactrowbodypart) | [compact-row-body-part](https://minifish-org.github.io/pith-ui/?item=compact-row-body-part) |
| [`createCompactRowPart`](#createcompactrowpart) | [compact-row-part](https://minifish-org.github.io/pith-ui/?item=compact-row-part) |
| [`createCompactSelectPart`](#createcompactselectpart) | [compact-select-part](https://minifish-org.github.io/pith-ui/?item=compact-select-part) |
| [`createComposerPanelsPart`](#createcomposerpanelspart) | [composer-panels-part](https://minifish-org.github.io/pith-ui/?item=composer-panels-part) |
| [`createComposerRegionPart`](#createcomposerregionpart) | [composer-region-part](https://minifish-org.github.io/pith-ui/?item=composer-region-part) |
| [`createCompoundDisclosurePart`](#createcompounddisclosurepart) | [compound-disclosure-part](https://minifish-org.github.io/pith-ui/?item=compound-disclosure-part) |
| [`createConnectionIndicatorPart`](#createconnectionindicatorpart) | [connection-indicator-part](https://minifish-org.github.io/pith-ui/?item=connection-indicator-part) |
| [`createContentSectionPart`](#createcontentsectionpart) | [content-section-part](https://minifish-org.github.io/pith-ui/?item=content-section-part) |
| [`createContentViewportPart`](#createcontentviewportpart) | [content-viewport-part](https://minifish-org.github.io/pith-ui/?item=content-viewport-part) |
| [`createContextLinePart`](#createcontextlinepart) | [context-line-part](https://minifish-org.github.io/pith-ui/?item=context-line-part) |
| [`createContextNotePart`](#createcontextnotepart) | [context-note-part](https://minifish-org.github.io/pith-ui/?item=context-note-part) |
| [`createCopyButtonPart`](#createcopybuttonpart) | [copy-button-part](https://minifish-org.github.io/pith-ui/?item=copy-button-part) |
| [`createCopyGroupPart`](#createcopygrouppart) | [copy-group-part](https://minifish-org.github.io/pith-ui/?item=copy-group-part) |
| [`createDescriptionListPart`](#createdescriptionlistpart) | [description-list-part](https://minifish-org.github.io/pith-ui/?item=description-list-part) |
| [`createDialogPart`](#createdialogpart) | [dialog-part](https://minifish-org.github.io/pith-ui/?item=dialog-part) |
| [`createDisclosureBodyPart`](#createdisclosurebodypart) | [disclosure-body-part](https://minifish-org.github.io/pith-ui/?item=disclosure-body-part) |
| [`createDisclosurePart`](#createdisclosurepart) | [disclosure-part](https://minifish-org.github.io/pith-ui/?item=disclosure-part) |
| [`createDownloadPart`](#createdownloadpart) | [download-part](https://minifish-org.github.io/pith-ui/?item=download-part) |
| [`createDrawerPart`](#createdrawerpart) | [drawer-part](https://minifish-org.github.io/pith-ui/?item=drawer-part) |
| [`createEmblemPart`](#createemblempart) | [emblem-part](https://minifish-org.github.io/pith-ui/?item=emblem-part) |
| [`createFeedbackPart`](#createfeedbackpart) | [feedback-part](https://minifish-org.github.io/pith-ui/?item=feedback-part) |
| [`createFieldGridPart`](#createfieldgridpart) | [field-grid-part](https://minifish-org.github.io/pith-ui/?item=field-grid-part) |
| [`createFieldGroupPart`](#createfieldgrouppart) | [field-group-part](https://minifish-org.github.io/pith-ui/?item=field-group-part) |
| [`createFieldLabelPart`](#createfieldlabelpart) | [field-label-part](https://minifish-org.github.io/pith-ui/?item=field-label-part) |
| [`createFieldStackPart`](#createfieldstackpart) | [field-stack-part](https://minifish-org.github.io/pith-ui/?item=field-stack-part) |
| [`createFieldsetPart`](#createfieldsetpart) | [fieldset-part](https://minifish-org.github.io/pith-ui/?item=fieldset-part) |
| [`createFilePickerPart`](#createfilepickerpart) | [file-picker-part](https://minifish-org.github.io/pith-ui/?item=file-picker-part) |
| [`createFoldingPart`](#createfoldingpart) | [folding-part](https://minifish-org.github.io/pith-ui/?item=folding-part) |
| [`createFooterPart`](#createfooterpart) | [footer-part](https://minifish-org.github.io/pith-ui/?item=footer-part) |
| [`createFormLayoutPart`](#createformlayoutpart) | [form-layout-part](https://minifish-org.github.io/pith-ui/?item=form-layout-part) |
| [`createFormPart`](#createformpart) | [form-part](https://minifish-org.github.io/pith-ui/?item=form-part) |
| [`createFramePart`](#createframepart) | [frame-part](https://minifish-org.github.io/pith-ui/?item=frame-part) |
| [`createGroupedCardPart`](#creategroupedcardpart) | [grouped-card-part](https://minifish-org.github.io/pith-ui/?item=grouped-card-part) |
| [`createIconNotePart`](#createiconnotepart) | [icon-note-part](https://minifish-org.github.io/pith-ui/?item=icon-note-part) |
| [`createIconPart`](#createiconpart) | [icon-part](https://minifish-org.github.io/pith-ui/?item=icon-part) |
| [`createImageGroupPart`](#createimagegrouppart) | [image-group-part](https://minifish-org.github.io/pith-ui/?item=image-group-part) |
| [`createImagePart`](#createimagepart) | [image-part](https://minifish-org.github.io/pith-ui/?item=image-part) |
| [`createInlineGroupPart`](#createinlinegrouppart) | [inline-group-part](https://minifish-org.github.io/pith-ui/?item=inline-group-part) |
| [`createInputActionsPart`](#createinputactionspart) | [input-actions-part](https://minifish-org.github.io/pith-ui/?item=input-actions-part) |
| [`createInputAdornmentPart`](#createinputadornmentpart) | [input-adornment-part](https://minifish-org.github.io/pith-ui/?item=input-adornment-part) |
| [`createInputContextPart`](#createinputcontextpart) | [input-context-part](https://minifish-org.github.io/pith-ui/?item=input-context-part) |
| [`createInputPart`](#createinputpart) | [input-part](https://minifish-org.github.io/pith-ui/?item=input-part) |
| [`createInputToolbarPart`](#createinputtoolbarpart) | [input-toolbar-part](https://minifish-org.github.io/pith-ui/?item=input-toolbar-part) |
| [`createInspectorHeadingPart`](#createinspectorheadingpart) | [inspector-heading-part](https://minifish-org.github.io/pith-ui/?item=inspector-heading-part) |
| [`createInspectorPart`](#createinspectorpart) | [inspector-part](https://minifish-org.github.io/pith-ui/?item=inspector-part) |
| [`createLabelledDividerPart`](#createlabelleddividerpart) | [labelled-divider-part](https://minifish-org.github.io/pith-ui/?item=labelled-divider-part) |
| [`createLabelledFieldPart`](#createlabelledfieldpart) | [labelled-field-part](https://minifish-org.github.io/pith-ui/?item=labelled-field-part) |
| [`createLineBreakPart`](#createlinebreakpart) | [line-break-part](https://minifish-org.github.io/pith-ui/?item=line-break-part) |
| [`createLinkPart`](#createlinkpart) | [link-part](https://minifish-org.github.io/pith-ui/?item=link-part) |
| [`createListPart`](#createlistpart) | [list-part](https://minifish-org.github.io/pith-ui/?item=list-part) |
| [`createListRowPart`](#createlistrowpart) | [list-row-part](https://minifish-org.github.io/pith-ui/?item=list-row-part) |
| [`createMainPart`](#createmainpart) | [main-part](https://minifish-org.github.io/pith-ui/?item=main-part) |
| [`createMarkdownPart`](#createmarkdownpart) | [markdown-part](https://minifish-org.github.io/pith-ui/?item=markdown-part) |
| [`createMediaToolbarPart`](#createmediatoolbarpart) | [media-toolbar-part](https://minifish-org.github.io/pith-ui/?item=media-toolbar-part) |
| [`createMenuPart`](#createmenupart) | [menu-part](https://minifish-org.github.io/pith-ui/?item=menu-part) |
| [`createMessageActionsPart`](#createmessageactionspart) | [message-actions-part](https://minifish-org.github.io/pith-ui/?item=message-actions-part) |
| [`createMessageFooterPart`](#createmessagefooterpart) | [message-footer-part](https://minifish-org.github.io/pith-ui/?item=message-footer-part) |
| [`createMessageInputPart`](#createmessageinputpart) | [message-input-part](https://minifish-org.github.io/pith-ui/?item=message-input-part) |
| [`createMetadataPart`](#createmetadatapart) | [metadata-part](https://minifish-org.github.io/pith-ui/?item=metadata-part) |
| [`createOptionActionPart`](#createoptionactionpart) | [option-action-part](https://minifish-org.github.io/pith-ui/?item=option-action-part) |
| [`createOptionGroupPart`](#createoptiongrouppart) | [option-group-part](https://minifish-org.github.io/pith-ui/?item=option-group-part) |
| [`createPaginationPart`](#createpaginationpart) | [pagination-part](https://minifish-org.github.io/pith-ui/?item=pagination-part) |
| [`createPopoverPart`](#createpopoverpart) | [popover-part](https://minifish-org.github.io/pith-ui/?item=popover-part) |
| [`createPreformattedPart`](#createpreformattedpart) | [preformatted-part](https://minifish-org.github.io/pith-ui/?item=preformatted-part) |
| [`createProgressPart`](#createprogresspart) | [progress-part](https://minifish-org.github.io/pith-ui/?item=progress-part) |
| [`createRailFooterPart`](#createrailfooterpart) | [rail-footer-part](https://minifish-org.github.io/pith-ui/?item=rail-footer-part) |
| [`createRailHeadingPart`](#createrailheadingpart) | [rail-heading-part](https://minifish-org.github.io/pith-ui/?item=rail-heading-part) |
| [`createReadingColumnPart`](#createreadingcolumnpart) | [reading-column-part](https://minifish-org.github.io/pith-ui/?item=reading-column-part) |
| [`createReadingNotePart`](#createreadingnotepart) | [reading-note-part](https://minifish-org.github.io/pith-ui/?item=reading-note-part) |
| [`createReadingRegionPart`](#createreadingregionpart) | [reading-region-part](https://minifish-org.github.io/pith-ui/?item=reading-region-part) |
| [`createReadingViewportPart`](#createreadingviewportpart) | [reading-viewport-part](https://minifish-org.github.io/pith-ui/?item=reading-viewport-part) |
| [`createResponsiveLeadPart`](#createresponsiveleadpart) | [responsive-lead-part](https://minifish-org.github.io/pith-ui/?item=responsive-lead-part) |
| [`createRowTextPart`](#createrowtextpart) | [row-text-part](https://minifish-org.github.io/pith-ui/?item=row-text-part) |
| [`createScrollAreaPart`](#createscrollareapart) | [scroll-area-part](https://minifish-org.github.io/pith-ui/?item=scroll-area-part) |
| [`createScrollListPart`](#createscrolllistpart) | [scroll-list-part](https://minifish-org.github.io/pith-ui/?item=scroll-list-part) |
| [`createSearchFieldPart`](#createsearchfieldpart) | [search-field-part](https://minifish-org.github.io/pith-ui/?item=search-field-part) |
| [`createSearchToolbarPart`](#createsearchtoolbarpart) | [search-toolbar-part](https://minifish-org.github.io/pith-ui/?item=search-toolbar-part) |
| [`createSecretLabelPart`](#createsecretlabelpart) | [secret-label-part](https://minifish-org.github.io/pith-ui/?item=secret-label-part) |
| [`createSectionHeadingPart`](#createsectionheadingpart) | [section-heading-part](https://minifish-org.github.io/pith-ui/?item=section-heading-part) |
| [`createSectionPart`](#createsectionpart) | [section-part](https://minifish-org.github.io/pith-ui/?item=section-part) |
| [`createSelectPart`](#createselectpart) | [select-part](https://minifish-org.github.io/pith-ui/?item=select-part) |
| [`createSelectableCardPart`](#createselectablecardpart) | [selectable-card-part](https://minifish-org.github.io/pith-ui/?item=selectable-card-part) |
| [`createSeparatedGroupPart`](#createseparatedgrouppart) | [separated-group-part](https://minifish-org.github.io/pith-ui/?item=separated-group-part) |
| [`createSeparatedSectionPart`](#createseparatedsectionpart) | [separated-section-part](https://minifish-org.github.io/pith-ui/?item=separated-section-part) |
| [`createSideRailPart`](#createsiderailpart) | [side-rail-part](https://minifish-org.github.io/pith-ui/?item=side-rail-part) |
| [`createStackPart`](#createstackpart) | [stack-part](https://minifish-org.github.io/pith-ui/?item=stack-part) |
| [`createStatusActionsPart`](#createstatusactionspart) | [status-actions-part](https://minifish-org.github.io/pith-ui/?item=status-actions-part) |
| [`createStatusPart`](#createstatuspart) | [status-part](https://minifish-org.github.io/pith-ui/?item=status-part) |
| [`createStepActionPart`](#createstepactionpart) | [step-action-part](https://minifish-org.github.io/pith-ui/?item=step-action-part) |
| [`createStepGroupPart`](#createstepgrouppart) | [step-group-part](https://minifish-org.github.io/pith-ui/?item=step-group-part) |
| [`createSuggestionGroupPart`](#createsuggestiongrouppart) | [suggestion-group-part](https://minifish-org.github.io/pith-ui/?item=suggestion-group-part) |
| [`createTablePart`](#createtablepart) | [table-part](https://minifish-org.github.io/pith-ui/?item=table-part) |
| [`createTableRowPart`](#createtablerowpart) | [table-row-part](https://minifish-org.github.io/pith-ui/?item=table-row-part) |
| [`createTextFlowPart`](#createtextflowpart) | [text-flow-part](https://minifish-org.github.io/pith-ui/?item=text-flow-part) |
| [`createTextPart`](#createtextpart) | [text-part](https://minifish-org.github.io/pith-ui/?item=text-part) |
| [`createTextareaPart`](#createtextareapart) | [textarea-part](https://minifish-org.github.io/pith-ui/?item=textarea-part) |
| [`createThumbnailPart`](#createthumbnailpart) | [thumbnail-part](https://minifish-org.github.io/pith-ui/?item=thumbnail-part) |
| [`createThumbnailStripPart`](#createthumbnailstrippart) | [thumbnail-strip-part](https://minifish-org.github.io/pith-ui/?item=thumbnail-strip-part) |
| [`createTimestampPart`](#createtimestamppart) | [timestamp-part](https://minifish-org.github.io/pith-ui/?item=timestamp-part) |
| [`createToastBodyPart`](#createtoastbodypart) | [toast-body-part](https://minifish-org.github.io/pith-ui/?item=toast-body-part) |
| [`createToastPart`](#createtoastpart) | [toast-part](https://minifish-org.github.io/pith-ui/?item=toast-part) |
| [`createToastStackPart`](#createtoaststackpart) | [toast-stack-part](https://minifish-org.github.io/pith-ui/?item=toast-stack-part) |
| [`createToolbarPart`](#createtoolbarpart) | [toolbar-part](https://minifish-org.github.io/pith-ui/?item=toolbar-part) |
| [`createTopbarActionsPart`](#createtopbaractionspart) | [topbar-actions-part](https://minifish-org.github.io/pith-ui/?item=topbar-actions-part) |
| [`createTopbarPart`](#createtopbarpart) | [topbar-part](https://minifish-org.github.io/pith-ui/?item=topbar-part) |
| [`createTrailingActionsPart`](#createtrailingactionspart) | [trailing-actions-part](https://minifish-org.github.io/pith-ui/?item=trailing-actions-part) |
| [`createTreeBranchPart`](#createtreebranchpart) | [tree-branch-part](https://minifish-org.github.io/pith-ui/?item=tree-branch-part) |
| [`createTreeItemPart`](#createtreeitempart) | [tree-item-part](https://minifish-org.github.io/pith-ui/?item=tree-item-part) |
| [`createTreePart`](#createtreepart) | [tree-part](https://minifish-org.github.io/pith-ui/?item=tree-part) |
| [`createWarningPart`](#createwarningpart) | [warning-part](https://minifish-org.github.io/pith-ui/?item=warning-part) |
| [`createWorkingIndicatorPart`](#createworkingindicatorpart) | [working-indicator-part](https://minifish-org.github.io/pith-ui/?item=working-indicator-part) |
| [`createZoomImagePart`](#createzoomimagepart) | [zoom-image-part](https://minifish-org.github.io/pith-ui/?item=zoom-image-part) |
| [`mountParts`](#mountparts) | [button-parts](https://minifish-org.github.io/pith-ui/?item=button-parts) |

## Public type index

- [`ActionsPart`](#actionspart)
- [`ActionsPartState`](#actionspartstate)
- [`ActivityPart`](#activitypart)
- [`ActivityPartState`](#activitypartstate)
- [`AnchoredGroupOptions`](#anchoredgroupoptions)
- [`AnchoredGroupPart`](#anchoredgrouppart)
- [`AnchoredGroupState`](#anchoredgroupstate)
- [`AnnouncementPart`](#announcementpart)
- [`AnnouncementPartState`](#announcementpartstate)
- [`Autocomplete`](#autocomplete)
- [`BadgePart`](#badgepart)
- [`BadgePartOptions`](#badgepartoptions)
- [`BadgePartState`](#badgepartstate)
- [`BrandMarkOptions`](#brandmarkoptions)
- [`BrandMarkPart`](#brandmarkpart)
- [`BrandPart`](#brandpart)
- [`BrandPartState`](#brandpartstate)
- [`BreadcrumbPart`](#breadcrumbpart)
- [`BreadcrumbPartState`](#breadcrumbpartstate)
- [`BubblePart`](#bubblepart)
- [`BubblePartState`](#bubblepartstate)
- [`ButtonPart`](#buttonpart)
- [`ButtonPartOptions`](#buttonpartoptions)
- [`ButtonPartState`](#buttonpartstate)
- [`ButtonVariant`](#buttonvariant)
- [`CalloutPart`](#calloutpart)
- [`CalloutPartOptions`](#calloutpartoptions)
- [`CalloutPartState`](#calloutpartstate)
- [`CaptionPart`](#captionpart)
- [`CardBodyPart`](#cardbodypart)
- [`CardPart`](#cardpart)
- [`CenteredContentPart`](#centeredcontentpart)
- [`CenteredContentState`](#centeredcontentstate)
- [`CheckboxOptions`](#checkboxoptions)
- [`CheckboxPart`](#checkboxpart)
- [`ChoiceOption`](#choiceoption)
- [`ChoiceOptions`](#choiceoptions)
- [`ChoicePart`](#choicepart)
- [`ChoiceState`](#choicestate)
- [`CodePropertyPart`](#codepropertypart)
- [`CodePropertyPartOptions`](#codepropertypartoptions)
- [`CodePropertyPartState`](#codepropertypartstate)
- [`CompactActionsPart`](#compactactionspart)
- [`CompactSelectOptions`](#compactselectoptions)
- [`CompactSelectPart`](#compactselectpart)
- [`CompactSelectPartState`](#compactselectpartstate)
- [`ComposerLayoutOptions`](#composerlayoutoptions)
- [`CompoundDisclosurePart`](#compounddisclosurepart)
- [`CompoundDisclosurePartOptions`](#compounddisclosurepartoptions)
- [`CompoundDisclosurePartState`](#compounddisclosurepartstate)
- [`ConnectionIndicatorPart`](#connectionindicatorpart)
- [`ConnectionIndicatorPartState`](#connectionindicatorpartstate)
- [`ContentActionResult`](#contentactionresult)
- [`ContentSectionPart`](#contentsectionpart)
- [`ContentSectionPartState`](#contentsectionpartstate)
- [`ContentSectionTone`](#contentsectiontone)
- [`ContentViewportContent`](#contentviewportcontent)
- [`ContentViewportOptions`](#contentviewportoptions)
- [`ContentViewportPart`](#contentviewportpart)
- [`ContextNotePart`](#contextnotepart)
- [`ContextNotePartState`](#contextnotepartstate)
- [`CopyButtonPartOptions`](#copybuttonpartoptions)
- [`DescriptionEntry`](#descriptionentry)
- [`DescriptionListPart`](#descriptionlistpart)
- [`DialogPart`](#dialogpart)
- [`DialogPartOptions`](#dialogpartoptions)
- [`DialogPartState`](#dialogpartstate)
- [`DisclosureBodyPurpose`](#disclosurebodypurpose)
- [`DisclosurePart`](#disclosurepart)
- [`DisclosurePartOptions`](#disclosurepartoptions)
- [`DisclosurePartState`](#disclosurepartstate)
- [`DisclosurePurpose`](#disclosurepurpose)
- [`DownloadPart`](#downloadpart)
- [`DownloadResult`](#downloadresult)
- [`DrawerPart`](#drawerpart)
- [`FeedbackPart`](#feedbackpart)
- [`FeedbackPartOptions`](#feedbackpartoptions)
- [`FeedbackPartState`](#feedbackpartstate)
- [`FieldGridPart`](#fieldgridpart)
- [`FieldGridPartState`](#fieldgridpartstate)
- [`FieldGroupPart`](#fieldgrouppart)
- [`FieldLabelPart`](#fieldlabelpart)
- [`FieldLabelState`](#fieldlabelstate)
- [`FieldStackPart`](#fieldstackpart)
- [`FieldStackPartState`](#fieldstackpartstate)
- [`FieldState`](#fieldstate)
- [`FieldsetPart`](#fieldsetpart)
- [`FieldsetPartState`](#fieldsetpartstate)
- [`FileDropData`](#filedropdata)
- [`FilePickerPart`](#filepickerpart)
- [`FloatingPart`](#floatingpart)
- [`FloatingPartState`](#floatingpartstate)
- [`FoldingPart`](#foldingpart)
- [`FoldingPartOptions`](#foldingpartoptions)
- [`FoldingPartState`](#foldingpartstate)
- [`FormPart`](#formpart)
- [`FormPartOptions`](#formpartoptions)
- [`FormPartState`](#formpartstate)
- [`FramePart`](#framepart)
- [`GroupedCardPart`](#groupedcardpart)
- [`IconName`](#iconname)
- [`IconNotePart`](#iconnotepart)
- [`IconNoteState`](#iconnotestate)
- [`IconPart`](#iconpart)
- [`IconPartState`](#iconpartstate)
- [`ImageData`](#imagedata)
- [`ImagePart`](#imagepart)
- [`ImagePartOptions`](#imagepartoptions)
- [`ImagePartState`](#imagepartstate)
- [`ImageStatus`](#imagestatus)
- [`InlineGroupPart`](#inlinegrouppart)
- [`InlineGroupPartState`](#inlinegrouppartstate)
- [`InputAdornmentPart`](#inputadornmentpart)
- [`InputAdornmentPartState`](#inputadornmentpartstate)
- [`InputKind`](#inputkind)
- [`InputOptions`](#inputoptions)
- [`InspectorHeadingPart`](#inspectorheadingpart)
- [`InspectorHeadingState`](#inspectorheadingstate)
- [`InspectorPart`](#inspectorpart)
- [`InspectorPartOptions`](#inspectorpartoptions)
- [`LabelledDividerPart`](#labelleddividerpart)
- [`LayoutPart`](#layoutpart)
- [`LinkPart`](#linkpart)
- [`LinkPartOptions`](#linkpartoptions)
- [`LinkPartState`](#linkpartstate)
- [`ListEntry`](#listentry)
- [`ListPart`](#listpart)
- [`ListPartState`](#listpartstate)
- [`ListRowPart`](#listrowpart)
- [`ListRowPartState`](#listrowpartstate)
- [`LocalContentLink`](#localcontentlink)
- [`MainPart`](#mainpart)
- [`MarkdownPart`](#markdownpart)
- [`MarkdownPartOptions`](#markdownpartoptions)
- [`MarkdownPartState`](#markdownpartstate)
- [`MediaToolbarPart`](#mediatoolbarpart)
- [`MenuPart`](#menupart)
- [`MenuPartItem`](#menupartitem)
- [`MenuPartState`](#menupartstate)
- [`MessageInputOptions`](#messageinputoptions)
- [`MessageInputPart`](#messageinputpart)
- [`MessageInputState`](#messageinputstate)
- [`MessageSelection`](#messageselection)
- [`MetadataPart`](#metadatapart)
- [`MetadataPartState`](#metadatapartstate)
- [`MetadataPurpose`](#metadatapurpose)
- [`MountPartsOptions`](#mountpartsoptions)
- [`MountedParts`](#mountedparts)
- [`NativeFileDropData`](#nativefiledropdata)
- [`OptionActionOptions`](#optionactionoptions)
- [`OptionActionPart`](#optionactionpart)
- [`OptionActionState`](#optionactionstate)
- [`OptionGroupPart`](#optiongrouppart)
- [`PaginationPart`](#paginationpart)
- [`PaginationPartOptions`](#paginationpartoptions)
- [`PaginationPartState`](#paginationpartstate)
- [`Part`](#part)
- [`PreformattedPart`](#preformattedpart)
- [`PreformattedPartOptions`](#preformattedpartoptions)
- [`PreformattedPartState`](#preformattedpartstate)
- [`ProgressPart`](#progresspart)
- [`ProgressPartState`](#progresspartstate)
- [`RailHeadingPart`](#railheadingpart)
- [`ReadingColumnPart`](#readingcolumnpart)
- [`ReadingNotePart`](#readingnotepart)
- [`ReadingSearchState`](#readingsearchstate)
- [`ReadingViewportOptions`](#readingviewportoptions)
- [`ReadingViewportPart`](#readingviewportpart)
- [`ResponsiveLeadPart`](#responsiveleadpart)
- [`ResponsiveLeadState`](#responsiveleadstate)
- [`RowTextPart`](#rowtextpart)
- [`RowTextPartState`](#rowtextpartstate)
- [`ScrollListPart`](#scrolllistpart)
- [`SearchFieldPart`](#searchfieldpart)
- [`SearchFieldPartOptions`](#searchfieldpartoptions)
- [`SearchFieldPartState`](#searchfieldpartstate)
- [`SearchToolbarPart`](#searchtoolbarpart)
- [`SearchToolbarPartState`](#searchtoolbarpartstate)
- [`SecretLabelPart`](#secretlabelpart)
- [`SecretLabelPartOptions`](#secretlabelpartoptions)
- [`SecretLabelPartState`](#secretlabelpartstate)
- [`SectionPart`](#sectionpart)
- [`SectionPartState`](#sectionpartstate)
- [`SelectOptions`](#selectoptions)
- [`SelectableCardPart`](#selectablecardpart)
- [`SelectableCardState`](#selectablecardstate)
- [`SideRailPart`](#siderailpart)
- [`StackPart`](#stackpart)
- [`StackPartOptions`](#stackpartoptions)
- [`StackPartState`](#stackpartstate)
- [`StatusActionsPart`](#statusactionspart)
- [`StatusPart`](#statuspart)
- [`StatusPartOptions`](#statuspartoptions)
- [`StatusPartState`](#statuspartstate)
- [`StepActionOptions`](#stepactionoptions)
- [`StepActionPart`](#stepactionpart)
- [`StepActionState`](#stepactionstate)
- [`StepGroupPart`](#stepgrouppart)
- [`StepGroupState`](#stepgroupstate)
- [`SuggestionGroupPart`](#suggestiongrouppart)
- [`TablePart`](#tablepart)
- [`TableRowPart`](#tablerowpart)
- [`TextFlowPart`](#textflowpart)
- [`TextFlowPartState`](#textflowpartstate)
- [`TextFlowRole`](#textflowrole)
- [`TextFlowSegment`](#textflowsegment)
- [`TextPart`](#textpart)
- [`TextPartState`](#textpartstate)
- [`TextRole`](#textrole)
- [`TextareaOptions`](#textareaoptions)
- [`ThumbnailPart`](#thumbnailpart)
- [`ThumbnailStripOptions`](#thumbnailstripoptions)
- [`ThumbnailStripPart`](#thumbnailstrippart)
- [`ThumbnailStripState`](#thumbnailstripstate)
- [`TimestampPart`](#timestamppart)
- [`ToolbarPart`](#toolbarpart)
- [`ToolbarPartState`](#toolbarpartstate)
- [`ToolbarPurpose`](#toolbarpurpose)
- [`TreeBranchPart`](#treebranchpart)
- [`TreeBranchPartState`](#treebranchpartstate)
- [`TreeItemPart`](#treeitempart)
- [`TreeItemPartState`](#treeitempartstate)
- [`TreePart`](#treepart)
- [`TreePartState`](#treepartstate)
- [`ValuePart`](#valuepart)
- [`WorkingIndicatorPart`](#workingindicatorpart)
- [`WorkingIndicatorPartState`](#workingindicatorpartstate)
- [`ZoomImageOptions`](#zoomimageoptions)
- [`ZoomImagePart`](#zoomimagepart)
- [`ZoomImageState`](#zoomimagestate)
- [`ZoomImageStatus`](#zoomimagestatus)

## Supporting declarations

The following supporting names explain signatures and private opaque identity. They are not additional package exports or extension points.

- [`ActionResult`](#actionresult)
- [`Appearance`](#appearance)
- [`ButtonState`](#buttonstate)
- [`CopyOptions`](#copyoptions)
- [`FloatingOptions`](#floatingoptions)
- [`NavigationButtonVariant`](#navigationbuttonvariant)
- [`OrdinaryButtonVariant`](#ordinarybuttonvariant)
- [`PromptButtonState`](#promptbuttonstate)
- [`UIAction`](#uiaction)
- [`frameRole`](#framerole)
- [`iconNames`](#iconnames)
- [`optionActionRole`](#optionactionrole)
- [`partBrand`](#partbrand)
- [`stepActionRole`](#stepactionrole)
- [`tableRowBrand`](#tablerowbrand)

### LocalContentLink

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/content/markdown.ts#L5)

```ts
export interface LocalContentLink {
    path: string;
    conversationId: string;
}
```

### ReadingSearchState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/content/reading-engine.ts#L3)

```ts
export interface ReadingSearchState {
    readonly open: boolean;
    readonly query: string;
    readonly current: number;
    readonly total: number;
    readonly label: string;
}
```

### ActionResult

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/core.ts#L8)

```ts
export type ActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
```

### UIAction

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/core.ts#L9)

```ts
export type UIAction = () => void | ActionResult | Promise<void | ActionResult>;
```

Referenced declarations: [`ActionResult`](#actionresult).

### AnnouncementPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/announcement.ts#L4)

```ts
export interface AnnouncementPart extends Part {
    update(state: Readonly<AnnouncementPartState>): void;
}
```

Referenced declarations: [`AnnouncementPartState`](#announcementpartstate), [`Part`](#part).

### AnnouncementPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/announcement.ts#L3)

```ts
export interface AnnouncementPartState {
    message: string;
}
```

### createAnnouncementPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/announcement.ts#L10)

```ts
/** A native polite live region with library-owned screen-reader presentation. */
export declare function createAnnouncementPart(initial: AnnouncementPartState): AnnouncementPart;
```

Referenced declarations: [`AnnouncementPart`](#announcementpart), [`AnnouncementPartState`](#announcementpartstate).

### BrandMarkOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L3)

```ts
export type BrandMarkOptions = {
    symbol: 'pith';
    alt: string;
    src?: never;
    darkSrc?: never;
} | {
    src: string;
    darkSrc?: string;
    alt: string;
    symbol?: never;
};
```

### BrandMarkPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L6)

```ts
export interface BrandMarkPart extends Part {
}
```

Referenced declarations: [`Part`](#part).

### BrandPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L36)

```ts
export interface BrandPart extends Part {
    update(state: Readonly<BrandPartState>): void;
}
```

Referenced declarations: [`BrandPartState`](#brandpartstate), [`Part`](#part).

### BrandPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L35)

```ts
export interface BrandPartState {
    name: string;
    qualifier?: string;
}
```

### createBrandMarkPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L11)

```ts
/** A fixed named symbol or image resource. Its geometry belongs to the library. */
export declare function createBrandMarkPart(options: BrandMarkOptions): BrandMarkPart;
```

Referenced declarations: [`BrandMarkOptions`](#brandmarkoptions), [`BrandMarkPart`](#brandmarkpart).

### createBrandPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/brand.ts#L41)

```ts
/** Wordmark and optional mark, using the established native display-contents structure. */
export declare function createBrandPart(options: BrandPartState & {
    mark?: BrandMarkPart;
}): BrandPart;
```

Referenced declarations: [`BrandMarkPart`](#brandmarkpart), [`BrandPart`](#brandpart), [`BrandPartState`](#brandpartstate).

### ButtonPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L37)

```ts
export interface ButtonPart extends Part {
    update(state: Readonly<ButtonPartState>): void;
    invalidate(): void;
    focus(): void;
}
```

Referenced declarations: [`ButtonPartState`](#buttonpartstate), [`Part`](#part).

### ButtonPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L31)

```ts
export type ButtonPartOptions = (ButtonPartState & {
    purpose?: 'action';
} | PromptButtonState & {
    purpose: 'prompt';
}) & {
    /** Prompt actions retain the established generic dialog presentation. */
    type?: 'button' | 'submit' | 'reset';
    onAction?: UIAction;
    onError?: (message: string) => void;
};
```

Referenced declarations: [`ButtonPartState`](#buttonpartstate), [`PromptButtonState`](#promptbuttonstate), [`UIAction`](#uiaction).

### ButtonPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L23)

```ts
export type ButtonPartState = PromptButtonState | ButtonState & {
    variant: NavigationButtonVariant;
    icon: IconName;
    menuExpanded?: never;
} | ButtonState & {
    variant: 'counter';
    icon: IconName;
    count: string;
    menuExpanded?: never;
} | ButtonState & {
    variant: 'picker' | 'suggestion';
    icon: IconName;
    menuExpanded?: never;
} | ButtonState & {
    variant: 'overlay-close';
    icon: 'close';
    menuExpanded?: never;
} | ButtonState & {
    variant: 'context-icon';
    icon: 'image';
    menuExpanded?: never;
} | ButtonState & {
    variant: 'submit-icon';
    icon: 'arrow';
    menuExpanded?: never;
} | ButtonState & {
    variant: 'stop-icon';
    icon: 'stop';
    menuExpanded?: never;
} | ButtonState & {
    variant: 'dismiss-icon';
    icon: 'close';
    menuExpanded?: never;
};
```

Referenced declarations: [`ButtonState`](#buttonstate), [`IconName`](#iconname), [`NavigationButtonVariant`](#navigationbuttonvariant), [`PromptButtonState`](#promptbuttonstate).

### ButtonState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L10)

```ts
interface ButtonState {
    label: string;
    disabled?: boolean;
    pending?: boolean;
    title?: string;
    hidden?: boolean;
    accessibleLabel?: string;
    type?: 'button' | 'submit' | 'reset';
}
```

### ButtonVariant

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L9)

```ts
export type ButtonVariant = OrdinaryButtonVariant | NavigationButtonVariant | 'quiet-icon' | 'counter' | 'picker' | 'suggestion' | 'overlay-close' | 'context-icon' | 'submit-icon' | 'stop-icon' | 'dismiss-icon';
```

Referenced declarations: [`NavigationButtonVariant`](#navigationbuttonvariant), [`OrdinaryButtonVariant`](#ordinarybuttonvariant).

### createButtonPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L82)

```ts
/** Retained product button markup, backed by the existing action controller. */
export declare function createButtonPart(options: ButtonPartOptions): ButtonPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`ButtonPartOptions`](#buttonpartoptions).

### NavigationButtonVariant

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L8)

```ts
type NavigationButtonVariant = 'navigation' | 'navigation-item' | 'toolbar-action' | 'drawer-trigger' | 'previous-match' | 'latest' | 'quiet-action';
```

### OrdinaryButtonVariant

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L7)

```ts
type OrdinaryButtonVariant = 'standard' | 'primary' | 'secondary' | 'danger' | 'warning' | 'caution' | 'text-action' | 'compact-choice';
```

### PromptButtonState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/button.ts#L19)

```ts
type PromptButtonState = ButtonState & ({
    variant: 'quiet-icon';
    icon: IconName;
    menuExpanded?: boolean;
} | {
    variant?: OrdinaryButtonVariant;
    icon?: IconName;
    menuExpanded?: never;
});
```

Referenced declarations: [`ButtonState`](#buttonstate), [`IconName`](#iconname), [`OrdinaryButtonVariant`](#ordinarybuttonvariant).

### CalloutPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L90)

```ts
export interface CalloutPart extends LayoutPart {
    update(state: Readonly<CalloutPartState>): void;
}
```

Referenced declarations: [`CalloutPartState`](#calloutpartstate), [`LayoutPart`](#layoutpart).

### CalloutPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L89)

```ts
export interface CalloutPartOptions extends CalloutPartState {
    children: readonly Part[];
    onDispose?(): void;
}
```

Referenced declarations: [`CalloutPartState`](#calloutpartstate), [`Part`](#part).

### CalloutPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L88)

```ts
export interface CalloutPartState {
    tone?: 'neutral' | 'warning';
    label?: string;
    announce?: 'none' | 'polite';
    hidden?: boolean;
}
```

### CardBodyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L41)

```ts
export interface CardBodyPart extends LayoutPart {
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### CardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L40)

```ts
export interface CardPart extends LayoutPart {
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### CompactActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L42)

```ts
export interface CompactActionsPart extends LayoutPart {
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### ContentSectionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L7)

```ts
export interface ContentSectionPart extends LayoutPart {
    update(state: Readonly<ContentSectionPartState>): void;
}
```

Referenced declarations: [`ContentSectionPartState`](#contentsectionpartstate), [`LayoutPart`](#layoutpart).

### ContentSectionPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L6)

```ts
export interface ContentSectionPartState {
    title?: string;
    tone?: ContentSectionTone;
    hidden?: boolean;
}
```

Referenced declarations: [`ContentSectionTone`](#contentsectiontone).

### ContentSectionTone

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L5)

```ts
export type ContentSectionTone = 'standard' | 'warning';
```

### createCalloutActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L61)

```ts
/** Trailing wrapping actions for a callout, without a field/footer border. */
export declare function createCalloutActionsPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createCalloutHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L59)

```ts
/** A compact review heading. Icons, literal text and badges are caller-owned parts. */
export declare function createCalloutHeadingPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createCalloutPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L93)

```ts
/** A bounded native surface. Every heading, message, icon and action remains
 * an independently composed child; this part supplies no application content. */
export declare function createCalloutPart(options: CalloutPartOptions): CalloutPart;
```

Referenced declarations: [`CalloutPart`](#calloutpart), [`CalloutPartOptions`](#calloutpartoptions).

### createCardBodyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L63)

```ts
/** Flexible card information. It supplies no implicit text, icon or action. */
export declare function createCardBodyPart(options: {
    children: readonly Part[];
}): CardBodyPart;
```

Referenced declarations: [`CardBodyPart`](#cardbodypart), [`Part`](#part).

### createCardHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L57)

```ts
/** A wrapping summary row. Callers compose their own text, status and actions. */
export declare function createCardHeadingPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createCardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L51)

```ts
/** One native card. Icons, text, and actions are composed as direct children. */
export declare function createCardPart(options: {
    children: readonly Part[];
    purpose?: 'row' | 'stacked';
}): CardPart;
```

Referenced declarations: [`CardPart`](#cardpart), [`Part`](#part).

### createCompactActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L65)

```ts
/** A compact action row with fixed button sizes and natural wrapping. */
export declare function createCompactActionsPart(options: {
    children: readonly Part[];
}): CompactActionsPart;
```

Referenced declarations: [`CompactActionsPart`](#compactactionspart), [`Part`](#part).

### createContentSectionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L14)

```ts
/** A content section with a native heading and the library's fixed vertical rhythm. */
export declare function createContentSectionPart(options: ContentSectionPartState & {
    children: readonly Part[];
}): ContentSectionPart;
```

Referenced declarations: [`ContentSectionPart`](#contentsectionpart), [`ContentSectionPartState`](#contentsectionpartstate), [`Part`](#part).

### createGroupedCardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L70)

```ts
/** A card with a summary row and following composed content. The single
 * intrinsic summary container is the existing native card structure. */
export declare function createGroupedCardPart(options: {
    summary: readonly Part[];
    children: readonly Part[];
}): GroupedCardPart;
```

Referenced declarations: [`GroupedCardPart`](#groupedcardpart), [`Part`](#part).

### GroupedCardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/cards.ts#L67)

```ts
export interface GroupedCardPart extends LayoutPart {
    replaceSummary(children: readonly Part[]): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L67)

```ts
/** Keyed direct row children. No list-item wrapper or public rendering callback. */
export declare function createListPart(options: ListPartState & {
    entries: readonly ListEntry[];
}): ListPart;
```

Referenced declarations: [`ListEntry`](#listentry), [`ListPart`](#listpart), [`ListPartState`](#listpartstate).

### createListRowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L18)

```ts
/** A small presentational row, with independently composed action buttons. */
export declare function createListRowPart(options: ListRowPartState & {
    actions?: ActionsPart;
}): ListRowPart;
```

Referenced declarations: [`ActionsPart`](#actionspart), [`ListRowPart`](#listrowpart), [`ListRowPartState`](#listrowpartstate).

### ListEntry

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L47)

```ts
export interface ListEntry {
    key: string;
    content: ListRowPart;
}
```

Referenced declarations: [`ListRowPart`](#listrowpart).

### ListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L49)

```ts
export interface ListPart extends Part {
    update(state: Readonly<ListPartState>): void;
    replace(entries: readonly ListEntry[]): void;
}
```

Referenced declarations: [`ListEntry`](#listentry), [`ListPartState`](#listpartstate), [`Part`](#part).

### ListPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L48)

```ts
export interface ListPartState {
    label: string;
    hidden?: boolean;
}
```

### ListRowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L7)

```ts
export interface ListRowPart extends Part {
    update(state: Readonly<ListRowPartState>): void;
}
```

Referenced declarations: [`ListRowPartState`](#listrowpartstate), [`Part`](#part).

### ListRowPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/collection.ts#L6)

```ts
export interface ListRowPartState {
    title: string;
    description?: string;
    meta?: string;
    icon?: IconName;
    selected?: boolean;
    hidden?: boolean;
}
```

Referenced declarations: [`IconName`](#iconname).

### createCompactRowActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L23)

```ts
export declare function createCompactRowActionsPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createCompactRowBodyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L22)

```ts
export declare function createCompactRowBodyPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createCompactRowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L21)

```ts
export declare function createCompactRowPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createRowTextPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L29)

```ts
/** A two-line literal preview or one small count. Library rules fix truncation
 * and typography; callers cannot choose a line count or presentation size. */
export declare function createRowTextPart(options: RowTextPartState & {
    purpose: 'preview' | 'count';
}): RowTextPart;
```

Referenced declarations: [`RowTextPart`](#rowtextpart), [`RowTextPartState`](#rowtextpartstate).

### createScrollListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L8)

```ts
/** A bounded native list surface. Heading, rows, badges and actions are all
 * independently composed; this part interprets no item data. */
export declare function createScrollListPart(options: {
    label: string;
    children: readonly Part[];
    hidden?: boolean;
    onDispose?(): void;
}): ScrollListPart;
```

Referenced declarations: [`Part`](#part), [`ScrollListPart`](#scrolllistpart).

### RowTextPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L26)

```ts
export interface RowTextPart extends Part {
    update(state: Readonly<RowTextPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`RowTextPartState`](#rowtextpartstate).

### RowTextPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L25)

```ts
export interface RowTextPartState {
    text: string;
    title?: string;
    hidden?: boolean;
}
```

### ScrollListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compact-list.ts#L5)

```ts
export interface ScrollListPart extends LayoutPart {
    update(state: {
        hidden: boolean;
    }): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### ComposerLayoutOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L3)

```ts
export interface ComposerLayoutOptions {
    children: readonly Part[];
    onDispose?(): void;
}
```

Referenced declarations: [`Part`](#part).

### createComposerPanelsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L9)

```ts
export declare function createComposerPanelsPart(options: ComposerLayoutOptions): LayoutPart;
```

Referenced declarations: [`ComposerLayoutOptions`](#composerlayoutoptions), [`LayoutPart`](#layoutpart).

### createComposerRegionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L8)

```ts
export declare function createComposerRegionPart(options: ComposerLayoutOptions): LayoutPart;
```

Referenced declarations: [`ComposerLayoutOptions`](#composerlayoutoptions), [`LayoutPart`](#layoutpart).

### createInputActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L12)

```ts
export declare function createInputActionsPart(options: ComposerLayoutOptions): LayoutPart;
```

Referenced declarations: [`ComposerLayoutOptions`](#composerlayoutoptions), [`LayoutPart`](#layoutpart).

### createInputContextPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L11)

```ts
export declare function createInputContextPart(options: ComposerLayoutOptions): LayoutPart;
```

Referenced declarations: [`ComposerLayoutOptions`](#composerlayoutoptions), [`LayoutPart`](#layoutpart).

### createInputToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/composer-layout.ts#L10)

```ts
export declare function createInputToolbarPart(options: ComposerLayoutOptions): LayoutPart;
```

Referenced declarations: [`ComposerLayoutOptions`](#composerlayoutoptions), [`LayoutPart`](#layoutpart).

### CompoundDisclosurePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L15)

```ts
export interface CompoundDisclosurePart extends LayoutPart {
    replaceSummary(children: readonly Part[]): void;
    update(state: Readonly<CompoundDisclosurePartState>): void;
    setOpen(open: boolean): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`CompoundDisclosurePartState`](#compounddisclosurepartstate), [`LayoutPart`](#layoutpart), [`Part`](#part).

### CompoundDisclosurePartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L6)

```ts
export interface CompoundDisclosurePartOptions extends CompoundDisclosurePartState {
    purpose: 'group' | 'result';
    summary: readonly Part[];
    children: readonly Part[];
    readingKey?: string;
    foldKey?: string;
    open?: boolean;
    onToggle?(open: boolean): void;
}
```

Referenced declarations: [`CompoundDisclosurePartState`](#compounddisclosurepartstate), [`Part`](#part).

### CompoundDisclosurePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L5)

```ts
export interface CompoundDisclosurePartState {
    hidden?: boolean;
    disabled?: boolean;
}
```

### createCompoundDisclosurePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L27)

```ts
/** Native details plus its required summary. The caller supplies every icon,
 * caption, count, status and content part; no tool or conversation is inferred. */
export declare function createCompoundDisclosurePart(options: CompoundDisclosurePartOptions): CompoundDisclosurePart;
```

Referenced declarations: [`CompoundDisclosurePart`](#compounddisclosurepart), [`CompoundDisclosurePartOptions`](#compounddisclosurepartoptions).

### createDisclosureBodyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L58)

```ts
/** A single empty native content region with a finite padding/border purpose. */
export declare function createDisclosureBodyPart(options: {
    purpose: DisclosureBodyPurpose;
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`DisclosureBodyPurpose`](#disclosurebodypurpose), [`LayoutPart`](#layoutpart), [`Part`](#part).

### DisclosureBodyPurpose

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/compound-disclosure.ts#L56)

```ts
export type DisclosureBodyPurpose = 'group' | 'details' | 'output';
```

### ContentActionResult

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L9)

```ts
export type ContentActionResult = void | ActionResult | Promise<void | ActionResult>;
```

Referenced declarations: [`ActionResult`](#actionresult).

### createMarkdownPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L32)

```ts
/** Sanitized content flow. Copy/link callbacks receive data, never rendered nodes. */
export declare function createMarkdownPart(options: MarkdownPartOptions): MarkdownPart;
```

Referenced declarations: [`MarkdownPart`](#markdownpart), [`MarkdownPartOptions`](#markdownpartoptions).

### createPreformattedPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L100)

```ts
/** Literal text or a line-oriented diff with the library's semantic colors. */
export declare function createPreformattedPart(options: PreformattedPartOptions): PreformattedPart;
```

Referenced declarations: [`PreformattedPart`](#preformattedpart), [`PreformattedPartOptions`](#preformattedpartoptions).

### MarkdownPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L24)

```ts
export interface MarkdownPart extends Part {
    update(state: Readonly<MarkdownPartState>): void;
}
```

Referenced declarations: [`MarkdownPartState`](#markdownpartstate), [`Part`](#part).

### MarkdownPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L18)

```ts
export interface MarkdownPartOptions extends MarkdownPartState {
    resolveLocalLink?(href: string): LocalContentLink | null;
    onLocalFile?(target: Readonly<LocalContentLink>): ContentActionResult;
    onCopyCode?(text: string): ContentActionResult;
    onError?(message: string): void;
}
```

Referenced declarations: [`ContentActionResult`](#contentactionresult), [`LocalContentLink`](#localcontentlink), [`MarkdownPartState`](#markdownpartstate).

### MarkdownPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L11)

```ts
export interface MarkdownPartState {
    text: string;
    disabled?: boolean;
    hidden?: boolean;
    /** Local-file actions have an independent availability scope from code copy. */
    localFileDisabled?: boolean;
    /** Availability used by copy feedback while pending/restoring, without blocking its first activation. */
    copyBusy?: boolean;
}
```

### PreformattedPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L97)

```ts
export interface PreformattedPart extends Part {
    update(state: Readonly<PreformattedPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`PreformattedPartState`](#preformattedpartstate).

### PreformattedPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L98)

```ts
export interface PreformattedPartOptions extends PreformattedPartState {
    kind?: 'text' | 'diff' | 'command' | 'plain';
}
```

Referenced declarations: [`PreformattedPartState`](#preformattedpartstate).

### PreformattedPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/content.ts#L96)

```ts
export interface PreformattedPartState {
    text: string;
    label?: string;
    hidden?: boolean;
}
```

### CopyButtonPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/copy-button.ts#L14)

```ts
export type CopyButtonPartOptions = CopyOptions<ButtonPartOptions>;
```

Referenced declarations: [`ButtonPartOptions`](#buttonpartoptions), [`CopyOptions`](#copyoptions).

### CopyOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/copy-button.ts#L7)

```ts
type CopyOptions<Options> = Options extends unknown ? Omit<Options, 'onAction' | 'onError'> & {
    /** Borrowed: mount the live region in the same tree as the button. */
    announcement: AnnouncementPart;
    successMessage: string | (() => string);
    onCopy: UIAction;
    onError?: (message: string) => void;
} : never;
```

Referenced declarations: [`AnnouncementPart`](#announcementpart), [`UIAction`](#uiaction).

### createCopyButtonPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/copy-button.ts#L17)

```ts
/** The retained native button owns its pending and fixed-lived copied feedback. */
export declare function createCopyButtonPart(options: CopyButtonPartOptions): ButtonPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`CopyButtonPartOptions`](#copybuttonpartoptions).

### createDescriptionListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/description-list.ts#L10)

```ts
/** Native keyed term/definition pairs, without a row wrapper. */
export declare function createDescriptionListPart(options: {
    entries: readonly DescriptionEntry[];
}): DescriptionListPart;
```

Referenced declarations: [`DescriptionEntry`](#descriptionentry), [`DescriptionListPart`](#descriptionlistpart).

### DescriptionEntry

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/description-list.ts#L3)

```ts
export interface DescriptionEntry {
    key: string;
    label: string;
    value: string;
}
```

### DescriptionListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/description-list.ts#L4)

```ts
export interface DescriptionListPart extends Part {
    update(entries: readonly DescriptionEntry[]): void;
}
```

Referenced declarations: [`DescriptionEntry`](#descriptionentry), [`Part`](#part).

### createDialogPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/dialog.ts#L23)

```ts
/** A standard native modal. Content and actions are independently composed parts. */
export declare function createDialogPart(options: DialogPartOptions): DialogPart;
```

Referenced declarations: [`DialogPart`](#dialogpart), [`DialogPartOptions`](#dialogpartoptions).

### DialogPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/dialog.ts#L14)

```ts
export interface DialogPart extends Part {
    update(state: Readonly<DialogPartState>): void;
    replace(children: readonly Part[]): void;
    open(): void;
    close(): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`DialogPartState`](#dialogpartstate), [`Part`](#part).

### DialogPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/dialog.ts#L6)

```ts
export interface DialogPartOptions extends DialogPartState {
    purpose?: 'form' | 'prompt' | 'feature' | 'warning' | 'image' | 'preview';
    children: readonly Part[];
    closeOnBackdrop?: boolean;
    onClose?(): void;
    /** Fires once before descendants are disposed, including parent teardown. */
    onDispose?(): void;
}
```

Referenced declarations: [`DialogPartState`](#dialogpartstate), [`Part`](#part).

### DialogPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/dialog.ts#L5)

```ts
export interface DialogPartState {
    title: string;
    description?: string;
    eyebrow?: string;
    closeLabel?: string;
    closeDisabled?: boolean;
}
```

### createDisclosurePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/disclosure.ts#L25)

```ts
/** Native details with a text summary and directly owned content parts. */
export declare function createDisclosurePart(options: DisclosurePartOptions): DisclosurePart;
```

Referenced declarations: [`DisclosurePart`](#disclosurepart), [`DisclosurePartOptions`](#disclosurepartoptions).

### DisclosurePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/disclosure.ts#L12)

```ts
export interface DisclosurePart extends Part {
    update(state: Readonly<DisclosurePartState>): void;
    replace(children: readonly Part[]): void;
    setOpen(open: boolean): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`DisclosurePartState`](#disclosurepartstate), [`Part`](#part).

### DisclosurePartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/disclosure.ts#L6)

```ts
export interface DisclosurePartOptions extends DisclosurePartState {
    purpose?: DisclosurePurpose;
    children: readonly Part[];
    open?: boolean;
    onToggle?(open: boolean): void;
}
```

Referenced declarations: [`DisclosurePartState`](#disclosurepartstate), [`DisclosurePurpose`](#disclosurepurpose), [`Part`](#part).

### DisclosurePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/disclosure.ts#L5)

```ts
export interface DisclosurePartState {
    title: string;
    disabled?: boolean;
    hidden?: boolean;
}
```

### DisclosurePurpose

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/disclosure.ts#L4)

```ts
export type DisclosurePurpose = 'plain' | 'advanced' | 'preview' | 'status' | 'breakdown';
```

### createDownloadPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/download.ts#L6)

```ts
/** Native file delivery with library-owned URL retirement. No style or DOM port. */
export declare function createDownloadPart(options?: Record<string, never>): DownloadPart;
```

Referenced declarations: [`DownloadPart`](#downloadpart).

### DownloadPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/download.ts#L4)

```ts
export interface DownloadPart extends Part {
    download(file: {
        blob: Blob;
        name: string;
    }): Promise<DownloadResult>;
}
```

Referenced declarations: [`DownloadResult`](#downloadresult), [`Part`](#part).

### DownloadResult

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/download.ts#L3)

```ts
export type DownloadResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
```

### createFeedbackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/feedback.ts#L9)

```ts
/** Inline feedback; its existing semantic error/hint presentation belongs here. */
export declare function createFeedbackPart(options: FeedbackPartOptions): FeedbackPart;
```

Referenced declarations: [`FeedbackPart`](#feedbackpart), [`FeedbackPartOptions`](#feedbackpartoptions).

### FeedbackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/feedback.ts#L6)

```ts
export interface FeedbackPart extends Part {
    update(state: Readonly<FeedbackPartState>): void;
}
```

Referenced declarations: [`FeedbackPartState`](#feedbackpartstate), [`Part`](#part).

### FeedbackPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/feedback.ts#L5)

```ts
export interface FeedbackPartOptions extends FeedbackPartState {
    presentation?: 'inline' | 'notice' | 'paragraph' | 'lead' | 'plain' | 'note' | 'banner';
}
```

Referenced declarations: [`FeedbackPartState`](#feedbackpartstate).

### FeedbackPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/feedback.ts#L4)

```ts
export interface FeedbackPartState {
    message: string;
    tone?: 'info' | 'error';
    announce?: 'none' | 'polite';
    hidden?: boolean;
}
```

### createFieldGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/field-group.ts#L6)

```ts
/** One native label/control group using the library's fixed field spacing. */
export declare function createFieldGroupPart(options: {
    children: readonly Part[];
}): FieldGroupPart;
```

Referenced declarations: [`FieldGroupPart`](#fieldgrouppart), [`Part`](#part).

### FieldGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/field-group.ts#L3)

```ts
export interface FieldGroupPart extends Part {
    replace(children: readonly Part[]): void;
}
```

Referenced declarations: [`Part`](#part).

### Autocomplete

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L25)

```ts
export type Autocomplete = 'off' | 'on' | 'url' | 'username' | 'current-password' | 'new-password' | 'one-time-code';
```

### CheckboxOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L343)

```ts
export interface CheckboxOptions {
    label: string;
    checked?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    name?: string;
    onChange?(value: boolean): void;
}
```

### CheckboxPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L344)

```ts
export interface CheckboxPart extends Part {
    read(): boolean;
    reset(value: boolean): void;
    update(state: {
        disabled?: boolean;
        label?: string;
        hidden?: boolean;
    }): void;
    focus(): void;
}
```

Referenced declarations: [`Part`](#part).

### ChoiceOption

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L147)

```ts
export interface ChoiceOption {
    value: string;
    label: string;
    disabled?: boolean;
}
```

### ChoiceOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L152)

```ts
export interface ChoiceOptions extends ChoiceState {
    options: readonly ChoiceOption[];
    value?: string;
    name?: string;
    onChange?(value: string): void;
}
```

Referenced declarations: [`ChoiceOption`](#choiceoption), [`ChoiceState`](#choicestate).

### ChoicePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L154)

```ts
export interface ChoicePart extends Part {
    read(): string;
    reset(value: string): void;
    update(state: Readonly<ChoiceState>): void;
    focus(): void;
}
```

Referenced declarations: [`ChoiceState`](#choicestate), [`Part`](#part).

### ChoiceState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L148)

```ts
export interface ChoiceState extends Omit<FieldState, 'readOnly' | 'placeholder'> {
    options?: readonly ChoiceOption[];
    catalog?: 'loading' | 'ready';
}
```

Referenced declarations: [`ChoiceOption`](#choiceoption), [`FieldState`](#fieldstate).

### CompactSelectOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L221)

```ts
export interface CompactSelectOptions extends CompactSelectPartState {
    purpose?: 'icon' | 'inline';
    label: string;
    icon?: IconName;
    options: readonly ChoiceOption[];
    value?: string;
    name?: string;
    onChange?(value: string): void;
}
```

Referenced declarations: [`ChoiceOption`](#choiceoption), [`CompactSelectPartState`](#compactselectpartstate), [`IconName`](#iconname).

### CompactSelectPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L222)

```ts
export interface CompactSelectPart extends ChoicePart {
    update(state: Readonly<CompactSelectPartState>): void;
}
```

Referenced declarations: [`ChoicePart`](#choicepart), [`CompactSelectPartState`](#compactselectpartstate).

### CompactSelectPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L220)

```ts
export interface CompactSelectPartState extends Omit<ChoiceState, 'catalog'> {
    tone?: 'standard' | 'warning';
}
```

Referenced declarations: [`ChoiceState`](#choicestate).

### createCheckboxPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L345)

```ts
export declare function createCheckboxPart(options: CheckboxOptions): CheckboxPart;
```

Referenced declarations: [`CheckboxOptions`](#checkboxoptions), [`CheckboxPart`](#checkboxpart).

### createChoiceListPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L218)

```ts
/** Native six-row choice list; its geometry and keyboard behavior belong to the library. */
export declare function createChoiceListPart(options: ChoiceOptions): ChoicePart;
```

Referenced declarations: [`ChoiceOptions`](#choiceoptions), [`ChoicePart`](#choicepart).

### createCompactSelectPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L225)

```ts
/** A compact icon choice in one native label. Its popup anchors to that label,
 * and its trailing indicator, hidden caption and warning treatment are fixed. */
export declare function createCompactSelectPart(options: CompactSelectOptions): CompactSelectPart;
```

Referenced declarations: [`CompactSelectOptions`](#compactselectoptions), [`CompactSelectPart`](#compactselectpart).

### createFieldLabelPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L268)

```ts
/** A separate native label associated with a previously created field. */
export declare function createFieldLabelPart(options: FieldLabelState & {
    control: ValuePart | ChoicePart;
    screenReaderOnly?: boolean;
    suffix?: BadgePart;
}): FieldLabelPart;
```

Referenced declarations: [`BadgePart`](#badgepart), [`ChoicePart`](#choicepart), [`FieldLabelPart`](#fieldlabelpart), [`FieldLabelState`](#fieldlabelstate), [`ValuePart`](#valuepart).

### createInputPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L112)

```ts
/** One native input. Labels and feedback are separate parts, without a field wrapper. */
export declare function createInputPart(options: InputOptions): ValuePart;
```

Referenced declarations: [`InputOptions`](#inputoptions), [`ValuePart`](#valuepart).

### createLabelledFieldPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L312)

```ts
/** A native containing label. Unlike a separate field label, it takes ownership
 * of its control and retains that same control through caption/state updates. */
export declare function createLabelledFieldPart(options: FieldLabelState & {
    control: ValuePart | ChoicePart;
}): FieldLabelPart;
```

Referenced declarations: [`ChoicePart`](#choicepart), [`FieldLabelPart`](#fieldlabelpart), [`FieldLabelState`](#fieldlabelstate), [`ValuePart`](#valuepart).

### createSelectPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L216)

```ts
export declare function createSelectPart(options: SelectOptions): ChoicePart;
```

Referenced declarations: [`ChoicePart`](#choicepart), [`SelectOptions`](#selectoptions).

### createTextareaPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L131)

```ts
export declare function createTextareaPart(options: TextareaOptions): ValuePart;
```

Referenced declarations: [`TextareaOptions`](#textareaoptions), [`ValuePart`](#valuepart).

### FieldLabelPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L266)

```ts
export interface FieldLabelPart extends Part {
    update(state: FieldLabelState): void;
}
```

Referenced declarations: [`FieldLabelState`](#fieldlabelstate), [`Part`](#part).

### FieldLabelState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L265)

```ts
export interface FieldLabelState {
    label: string;
    hidden?: boolean;
}
```

### FieldState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L8)

```ts
export interface FieldState {
    label?: string;
    disabled?: boolean;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    hidden?: boolean;
    describedBy?: readonly TextPart[];
}
```

Referenced declarations: [`TextPart`](#textpart).

### InputKind

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L24)

```ts
export type InputKind = 'text' | 'search' | 'password' | 'url' | 'number';
```

### InputOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L26)

```ts
export interface InputOptions extends FieldState {
    purpose?: 'text' | 'path';
    kind?: InputKind;
    value?: string;
    name?: string;
    autocomplete?: Autocomplete;
    /** Native value validation, never a presentation dimension. */
    min?: number;
    max?: number;
    step?: number | 'any';
    pattern?: string;
    onInput?(value: string): void;
    onChange?(value: string): void;
    /** Native validation intent; no browser Event or control escapes. */
    onInvalid?(): void;
    /** An optional Enter intent. Without this callback native Enter is untouched. */
    onEnter?(direction: 'next' | 'previous'): void;
}
```

Referenced declarations: [`Autocomplete`](#autocomplete), [`FieldState`](#fieldstate), [`InputKind`](#inputkind).

### SelectOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L153)

```ts
export interface SelectOptions extends ChoiceOptions {
    purpose?: 'field' | 'preference';
}
```

Referenced declarations: [`ChoiceOptions`](#choiceoptions).

### TextareaOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L128)

```ts
export interface TextareaOptions extends Omit<InputOptions, 'purpose' | 'kind' | 'min' | 'max' | 'step' | 'pattern' | 'onEnter'> {
    purpose?: 'text' | 'markdown' | 'secret' | 'json' | 'message' | 'queue-message';
}
```

Referenced declarations: [`InputOptions`](#inputoptions).

### ValuePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/fields.ts#L17)

```ts
export interface ValuePart extends Part {
    read(): string;
    reset(value: string): void;
    update(state: Readonly<FieldState>): void;
    focus(): void;
    selectAll(): void;
}
```

Referenced declarations: [`FieldState`](#fieldstate), [`Part`](#part).

### createMenuPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L101)

```ts
/** A keyboard menu with the retained menu row markup and no coordinate input. */
export declare function createMenuPart(options: MenuPartState & {
    relatedDialogs?: readonly DialogPart[];
    onToggle?(open: boolean): void;
    onError?(message: string): void;
}): MenuPart;
```

Referenced declarations: [`DialogPart`](#dialogpart), [`MenuPart`](#menupart), [`MenuPartState`](#menupartstate).

### createPopoverPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L69)

```ts
/** One small anchored region; content ownership and borrowed source are explicit. */
export declare function createPopoverPart(options: FloatingOptions & {
    content: Part;
}): FloatingPart;
```

Referenced declarations: [`FloatingOptions`](#floatingoptions), [`FloatingPart`](#floatingpart), [`Part`](#part).

### FloatingOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L16)

```ts
interface FloatingOptions extends FloatingPartState {
    relatedDialogs?: readonly DialogPart[];
    onToggle?(open: boolean): void;
}
```

Referenced declarations: [`DialogPart`](#dialogpart), [`FloatingPartState`](#floatingpartstate).

### FloatingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L10)

```ts
export interface FloatingPart extends Part {
    update(state: Readonly<FloatingPartState>): void;
    open(trigger: ButtonPart): void;
    close(): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`FloatingPartState`](#floatingpartstate), [`Part`](#part).

### FloatingPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L9)

```ts
export interface FloatingPartState {
    label: string;
    disabled?: boolean;
}
```

### MenuPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L86)

```ts
export interface MenuPart extends Omit<FloatingPart, 'update'> {
    update(state: Readonly<MenuPartState>): void;
}
```

Referenced declarations: [`FloatingPart`](#floatingpart), [`MenuPartState`](#menupartstate).

### MenuPartItem

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L84)

```ts
export interface MenuPartItem {
    key: string;
    label: string;
    disabled?: boolean;
    checked?: boolean;
    intent?: 'neutral' | 'danger';
    onAction: UIAction;
}
```

Referenced declarations: [`UIAction`](#uiaction).

### MenuPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/floating.ts#L85)

```ts
export interface MenuPartState extends FloatingPartState {
    items: readonly MenuPartItem[];
}
```

Referenced declarations: [`FloatingPartState`](#floatingpartstate), [`MenuPartItem`](#menupartitem).

### createFoldingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/folding.ts#L12)

```ts
/** One owned body can be always visible or placed inside native details.
 * The body is never copied, replaced or given an additional layout wrapper. */
export declare function createFoldingPart(options: FoldingPartOptions): FoldingPart;
```

Referenced declarations: [`FoldingPart`](#foldingpart), [`FoldingPartOptions`](#foldingpartoptions).

### FoldingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/folding.ts#L5)

```ts
export interface FoldingPart extends Part {
    update(state: Readonly<FoldingPartState>): void;
    setOpen(open: boolean): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`FoldingPartState`](#foldingpartstate), [`Part`](#part).

### FoldingPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/folding.ts#L4)

```ts
export interface FoldingPartOptions extends FoldingPartState {
    purpose?: 'plain' | 'review';
    body: Part;
    open?: boolean;
    onToggle?(open: boolean): void;
}
```

Referenced declarations: [`FoldingPartState`](#foldingpartstate), [`Part`](#part).

### FoldingPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/folding.ts#L3)

```ts
export interface FoldingPartState {
    title: string;
    collapsible: boolean;
}
```

### createCopyGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L14)

```ts
/** Contiguous explanatory text and feedback, without additional paragraph gaps. */
export declare function createCopyGroupPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createFieldStackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L63)

```ts
/** A single label/control/feedback stack; no automatic field wrappers. */
export declare function createFieldStackPart(options: FieldStackPartState & {
    children: readonly Part[];
}): FieldStackPart;
```

Referenced declarations: [`FieldStackPart`](#fieldstackpart), [`FieldStackPartState`](#fieldstackpartstate), [`Part`](#part).

### createFormLayoutPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L6)

```ts
/** A grouped form's spacing scope; it supplies no headings, fields or actions. */
export declare function createFormLayoutPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createSectionHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L28)

```ts
/** A compact heading row; title content and optional actions remain explicit. */
export declare function createSectionHeadingPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createSectionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L41)

```ts
/** One semantic section and its optional native heading, with fixed form rhythm. */
export declare function createSectionPart(options: SectionPartState & {
    children: readonly Part[];
}): SectionPart;
```

Referenced declarations: [`Part`](#part), [`SectionPart`](#sectionpart), [`SectionPartState`](#sectionpartstate).

### createSeparatedSectionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L22)

```ts
/** A ruled editor section with the library's fixed separation from prior content. */
export declare function createSeparatedSectionPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### FieldStackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L61)

```ts
export interface FieldStackPart extends LayoutPart {
    update(state: Readonly<FieldStackPartState>): void;
}
```

Referenced declarations: [`FieldStackPartState`](#fieldstackpartstate), [`LayoutPart`](#layoutpart).

### FieldStackPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L60)

```ts
export interface FieldStackPartState {
    hidden?: boolean;
}
```

### SectionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L35)

```ts
export interface SectionPart extends LayoutPart {
    update(state: Readonly<SectionPartState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`SectionPartState`](#sectionpartstate).

### SectionPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form-layout.ts#L34)

```ts
export interface SectionPartState {
    title?: string;
    hidden?: boolean;
}
```

### createFormPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L30)

```ts
/** A native form without a fieldset or layout wrapper. Validation stays native. */
export declare function createFormPart(options: FormPartOptions): FormPart;
```

Referenced declarations: [`FormPart`](#formpart), [`FormPartOptions`](#formpartoptions).

### FileDropData

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L6)

```ts
export interface FileDropData {
    readonly files: readonly File[];
    readonly uris: string;
}
```

### FormPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L18)

```ts
export interface FormPart extends Part {
    update(state: Readonly<FormPartState>): void;
    replace(children: readonly Part[]): void;
    submit(): void;
    reportValidity(): boolean;
    invalidate(): void;
    reset(): void;
    isPending(): boolean;
    receiveNativeDrop(data: Readonly<NativeFileDropData>): void;
}
```

Referenced declarations: [`FormPartState`](#formpartstate), [`NativeFileDropData`](#nativefiledropdata), [`Part`](#part).

### FormPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L9)

```ts
export interface FormPartOptions extends FormPartState {
    purpose?: 'form' | 'text-entry' | 'confirmation' | 'answer' | 'composer';
    children: readonly Part[];
    onSubmit?(): void | ActionResult | Promise<void | ActionResult>;
    onPending?(pending: boolean): void;
    onError?(message: string): void;
    onDrop?(data: Readonly<FileDropData>): void;
    onNativeDrop?(paths: readonly string[]): void;
}
```

Referenced declarations: [`ActionResult`](#actionresult), [`FileDropData`](#filedropdata), [`FormPartState`](#formpartstate), [`Part`](#part).

### FormPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L5)

```ts
export interface FormPartState {
    disabled?: boolean;
    hidden?: boolean;
    dropEnabled?: boolean;
}
```

### NativeFileDropData

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/form.ts#L8)

```ts
/** Coordinates are incoming native pointer data, never a layout parameter. */
export interface NativeFileDropData {
    readonly paths: readonly string[];
    readonly x: number;
    readonly y: number;
}
```

### createDrawerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L55)

```ts
/** The native scrim and fixed mobile drawer behavior. References are borrowed;
 * the frame's ordinary child tree owns rail, main, trigger, scrim and dialogs. */
export declare function createDrawerPart(options: {
    scope: FramePart;
    panel: SideRailPart;
    content: MainPart;
    trigger: ButtonPart;
}): DrawerPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`DrawerPart`](#drawerpart), [`FramePart`](#framepart), [`MainPart`](#mainpart), [`SideRailPart`](#siderailpart).

### createFramePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L18)

```ts
/** Viewport layout only: callers supply every region and dialog as child parts. */
export declare function createFramePart(options: {
    children: readonly Part[];
    onDispose?(): void;
    onModalChange?(open: boolean): void;
}): FramePart;
```

Referenced declarations: [`FramePart`](#framepart), [`Part`](#part).

### createMainPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L33)

```ts
export declare function createMainPart(options: {
    children: readonly Part[];
}): MainPart;
```

Referenced declarations: [`MainPart`](#mainpart), [`Part`](#part).

### createRailFooterPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L37)

```ts
export declare function createRailFooterPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createRailHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L40)

```ts
export declare function createRailHeadingPart(options: {
    label: string;
    actions: readonly ButtonPart[];
}): RailHeadingPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`RailHeadingPart`](#railheadingpart).

### createSideRailPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L32)

```ts
export declare function createSideRailPart(options: {
    children: readonly Part[];
}): SideRailPart;
```

Referenced declarations: [`Part`](#part), [`SideRailPart`](#siderailpart).

### createTopbarActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L36)

```ts
/** A trailing header action group. Children remain caller-owned content. */
export declare function createTopbarActionsPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createTopbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L34)

```ts
export declare function createTopbarPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### DrawerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L52)

```ts
export interface DrawerPart extends Part {
    setOpen(open: boolean): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`Part`](#part).

### FramePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L7)

```ts
export interface FramePart extends LayoutPart {
    readonly [frameRole]: 'frame';
    hasModal(): boolean;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`frameRole`](#framerole).

### frameRole

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L6)

```ts
declare const frameRole: unique symbol;
```

### MainPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L9)

```ts
export interface MainPart extends LayoutPart {
    readonly [frameRole]: 'main';
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`frameRole`](#framerole).

### RailHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L39)

```ts
export interface RailHeadingPart extends Part {
    update(state: {
        label: string;
    }): void;
}
```

Referenced declarations: [`Part`](#part).

### SideRailPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/frame.ts#L8)

```ts
export interface SideRailPart extends LayoutPart {
    readonly [frameRole]: 'rail';
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`frameRole`](#framerole).

### createImagePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L28)

```ts
/** A single native image. Its semantic purpose selects the established rules. */
export declare function createImagePart(options: ImagePartOptions): ImagePart;
```

Referenced declarations: [`ImagePart`](#imagepart), [`ImagePartOptions`](#imagepartoptions).

### createZoomImagePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L80)

```ts
/** One fixed image viewport. The library owns all physical sizing and zoom steps. */
export declare function createZoomImagePart(options: ZoomImageOptions): ZoomImagePart;
```

Referenced declarations: [`ZoomImageOptions`](#zoomimageoptions), [`ZoomImagePart`](#zoomimagepart).

### ImageData

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L4)

```ts
export interface ImageData {
    readonly src: string;
    readonly alt: string;
}
```

### ImagePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L12)

```ts
export interface ImagePart extends Part {
    update(state: Readonly<ImagePartState>): void;
    focus(): void;
}
```

Referenced declarations: [`ImagePartState`](#imagepartstate), [`Part`](#part).

### ImagePartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L6)

```ts
export interface ImagePartOptions extends ImagePartState {
    purpose: 'content' | 'attachment' | 'preview';
    onActivate?(image: ImageData): void;
    onLoad?(image: ImageData): void;
    onError?(image: ImageData): void;
}
```

Referenced declarations: [`ImageData`](#imagedata), [`ImagePartState`](#imagepartstate).

### ImagePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L5)

```ts
export interface ImagePartState {
    src?: string;
    alt?: string;
    status?: ImageStatus;
}
```

Referenced declarations: [`ImageStatus`](#imagestatus).

### ImageStatus

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L3)

```ts
export type ImageStatus = 'loading' | 'ready' | 'unavailable';
```

### ZoomImageOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L69)

```ts
export interface ZoomImageOptions extends ZoomImageState {
    onStatus?(status: ZoomImageStatus): void;
}
```

Referenced declarations: [`ZoomImageState`](#zoomimagestate), [`ZoomImageStatus`](#zoomimagestatus).

### ZoomImagePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L70)

```ts
export interface ZoomImagePart extends Part {
    update(state: Readonly<ZoomImageState>): void;
    fit(): void;
    original(): void;
    zoomIn(): void;
    zoomOut(): void;
    clear(): void;
}
```

Referenced declarations: [`Part`](#part), [`ZoomImageState`](#zoomimagestate).

### ZoomImageState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L67)

```ts
export interface ZoomImageState {
    src?: string;
    alt?: string;
}
```

### ZoomImageStatus

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/image.ts#L68)

```ts
export interface ZoomImageStatus {
    readonly status: ImageStatus;
    readonly label: string;
}
```

Referenced declarations: [`ImageStatus`](#imagestatus).

### AnchoredGroupOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L27)

```ts
export interface AnchoredGroupOptions extends AnchoredGroupState {
    trigger: ButtonPart;
    surface: InspectorPart;
    onDispose?(): void;
}
```

Referenced declarations: [`AnchoredGroupState`](#anchoredgroupstate), [`ButtonPart`](#buttonpart), [`InspectorPart`](#inspectorpart).

### AnchoredGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L28)

```ts
export interface AnchoredGroupPart extends Part {
    update(state: Readonly<AnchoredGroupState>): void;
}
```

Referenced declarations: [`AnchoredGroupState`](#anchoredgroupstate), [`Part`](#part).

### AnchoredGroupState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L26)

```ts
export interface AnchoredGroupState {
    hidden?: boolean;
}
```

### createAnchoredGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L85)

```ts
/** Only the original relative wrapper. Toggling remains caller assembly code. */
export declare function createAnchoredGroupPart(options: AnchoredGroupOptions): AnchoredGroupPart;
```

Referenced declarations: [`AnchoredGroupOptions`](#anchoredgroupoptions), [`AnchoredGroupPart`](#anchoredgrouppart).

### createInspectorHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L11)

```ts
/** A compact heading with literal count content and a caller-owned action. */
export declare function createInspectorHeadingPart(options: InspectorHeadingState & {
    action: ButtonPart;
}): InspectorHeadingPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`InspectorHeadingPart`](#inspectorheadingpart), [`InspectorHeadingState`](#inspectorheadingstate).

### createInspectorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L34)

```ts
/** One native, nonmodal section. It supplies dismissal and fixed presentation;
 * callers independently compose its heading, status, scroll region and rows. */
export declare function createInspectorPart(options: InspectorPartOptions): InspectorPart;
```

Referenced declarations: [`InspectorPart`](#inspectorpart), [`InspectorPartOptions`](#inspectorpartoptions).

### InspectorHeadingPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L8)

```ts
export interface InspectorHeadingPart extends Part {
    update(state: Readonly<InspectorHeadingState>): void;
}
```

Referenced declarations: [`InspectorHeadingState`](#inspectorheadingstate), [`Part`](#part).

### InspectorHeadingState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L7)

```ts
export interface InspectorHeadingState {
    title: string;
    count: string;
}
```

### InspectorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L25)

```ts
export interface InspectorPart extends Part {
    replace(children: readonly Part[]): void;
    setRelatedDialogs(dialogs: readonly DialogPart[]): void;
    open(trigger: ButtonPart): void;
    close(restoreFocus?: boolean): void;
    isOpen(): boolean;
}
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`DialogPart`](#dialogpart), [`Part`](#part).

### InspectorPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/inspector.ts#L24)

```ts
export interface InspectorPartOptions {
    heading: InspectorHeadingPart;
    children: readonly Part[];
    relatedDialogs?: readonly DialogPart[];
}
```

Referenced declarations: [`DialogPart`](#dialogpart), [`InspectorHeadingPart`](#inspectorheadingpart), [`Part`](#part).

### ActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L6)

```ts
export interface ActionsPart extends LayoutPart {
    update(state: Readonly<ActionsPartState>): void;
}
```

Referenced declarations: [`ActionsPartState`](#actionspartstate), [`LayoutPart`](#layoutpart).

### ActionsPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L5)

```ts
export interface ActionsPartState {
    align?: 'start' | 'end' | 'between';
    hidden?: boolean;
}
```

### createActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L26)

```ts
export declare function createActionsPart(options: ActionsPartState & {
    children: readonly Part[];
}): ActionsPart;
```

Referenced declarations: [`ActionsPart`](#actionspart), [`ActionsPartState`](#actionspartstate), [`Part`](#part).

### createFooterPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L28)

```ts
/** A small modal action row, with the library-owned border and spacing. */
export declare function createFooterPart(options: ActionsPartState & {
    children: readonly Part[];
}): ActionsPart;
```

Referenced declarations: [`ActionsPart`](#actionspart), [`ActionsPartState`](#actionspartstate), [`Part`](#part).

### createInlineGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L76)

```ts
/** Native inline flow for adjacent controls or text; no additional layout rule. */
export declare function createInlineGroupPart(options: InlineGroupPartState & {
    children: readonly Part[];
}): InlineGroupPart;
```

Referenced declarations: [`InlineGroupPart`](#inlinegrouppart), [`InlineGroupPartState`](#inlinegrouppartstate), [`Part`](#part).

### createStackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L61)

```ts
/** Natural block flow. No spacing, dimensions, CSS classes or layout DSL. */
export declare function createStackPart(options: StackPartOptions): StackPart;
```

Referenced declarations: [`StackPart`](#stackpart), [`StackPartOptions`](#stackpartoptions).

### createToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L38)

```ts
export declare function createToolbarPart(options: ToolbarPartState & {
    children: readonly Part[];
    purpose?: ToolbarPurpose;
}): ToolbarPart;
```

Referenced declarations: [`Part`](#part), [`ToolbarPart`](#toolbarpart), [`ToolbarPartState`](#toolbarpartstate), [`ToolbarPurpose`](#toolbarpurpose).

### InlineGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L74)

```ts
export interface InlineGroupPart extends LayoutPart {
    update(state: Readonly<InlineGroupPartState>): void;
}
```

Referenced declarations: [`InlineGroupPartState`](#inlinegrouppartstate), [`LayoutPart`](#layoutpart).

### InlineGroupPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L73)

```ts
export interface InlineGroupPartState {
    hidden?: boolean;
}
```

### LayoutPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L4)

```ts
export interface LayoutPart extends Part {
    replace(children: readonly Part[]): void;
}
```

Referenced declarations: [`Part`](#part).

### StackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L56)

```ts
export interface StackPart extends LayoutPart {
    update(state: Readonly<StackPartState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`StackPartState`](#stackpartstate).

### StackPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L55)

```ts
export interface StackPartOptions extends StackPartState {
    children: readonly Part[];
    onDispose?(): void;
}
```

Referenced declarations: [`Part`](#part), [`StackPartState`](#stackpartstate).

### StackPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L54)

```ts
export interface StackPartState {
    hidden?: boolean;
}
```

### ToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L32)

```ts
export interface ToolbarPart extends LayoutPart {
    update(state: Readonly<ToolbarPartState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`ToolbarPartState`](#toolbarpartstate).

### ToolbarPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L30)

```ts
export interface ToolbarPartState {
    label: string;
    hidden?: boolean;
}
```

### ToolbarPurpose

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/layout.ts#L31)

```ts
export type ToolbarPurpose = 'tools' | 'feature';
```

### createLinkPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/link.ts#L22)

```ts
/** One external HTTP link, with fixed browser security attributes and a data callback. */
export declare function createLinkPart(options: LinkPartOptions): LinkPart;
```

Referenced declarations: [`LinkPart`](#linkpart), [`LinkPartOptions`](#linkpartoptions).

### LinkPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/link.ts#L11)

```ts
export interface LinkPart extends Part {
    update(state: Readonly<LinkPartState>): void;
}
```

Referenced declarations: [`LinkPartState`](#linkpartstate), [`Part`](#part).

### LinkPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/link.ts#L6)

```ts
export interface LinkPartOptions extends LinkPartState {
    presentation?: 'inline' | 'paragraph';
    onOpen?(url: string): void | ActionResult | Promise<void | ActionResult>;
    onError?(message: string): void;
}
```

Referenced declarations: [`ActionResult`](#actionresult), [`LinkPartState`](#linkpartstate).

### LinkPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/link.ts#L5)

```ts
export interface LinkPartState {
    label: string;
    href?: string;
    hidden?: boolean;
    disabled?: boolean;
}
```

### createMediaToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/media-toolbar.ts#L6)

```ts
/** A media status and action group. The one inner DIV is the existing layout. */
export declare function createMediaToolbarPart(options: {
    status: TextPart;
    actions: readonly Part[];
}): MediaToolbarPart;
```

Referenced declarations: [`MediaToolbarPart`](#mediatoolbarpart), [`Part`](#part), [`TextPart`](#textpart).

### MediaToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/media-toolbar.ts#L4)

```ts
export interface MediaToolbarPart extends Part {
    replaceActions(actions: readonly Part[]): void;
}
```

Referenced declarations: [`Part`](#part).

### createFilePickerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L36)

```ts
/** A native image chooser with the library's supported image formats. */
export declare function createFilePickerPart(options: {
    kind: 'images';
    disabled?: boolean;
    onFiles(files: File[]): void;
}): FilePickerPart;
```

Referenced declarations: [`FilePickerPart`](#filepickerpart).

### createMessageInputPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L14)

```ts
/** One native drafting textarea. Growth and composition behavior are fixed. */
export declare function createMessageInputPart(options: MessageInputOptions): MessageInputPart;
```

Referenced declarations: [`MessageInputOptions`](#messageinputoptions), [`MessageInputPart`](#messageinputpart).

### FilePickerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L34)

```ts
export interface FilePickerPart extends Part {
    pick(): void;
    update(state: {
        disabled: boolean;
    }): void;
}
```

Referenced declarations: [`Part`](#part).

### MessageInputOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L5)

```ts
export interface MessageInputOptions extends MessageInputState {
    value?: string;
    onInput?(text: string): void;
    onSubmit?(): void;
    onBlur?(): void;
    onImages?(files: File[]): void;
}
```

Referenced declarations: [`MessageInputState`](#messageinputstate).

### MessageInputPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L7)

```ts
export interface MessageInputPart extends Part {
    update(state: Readonly<MessageInputState>): void;
    read(): string;
    reset(value: string): void;
    focus(): void;
    selectAll(): void;
    readSelection(): Readonly<MessageSelection>;
    replaceSelection(text: string): void;
}
```

Referenced declarations: [`MessageInputState`](#messageinputstate), [`MessageSelection`](#messageselection), [`Part`](#part).

### MessageInputState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L4)

```ts
export interface MessageInputState {
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
}
```

### MessageSelection

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/message-input.ts#L6)

```ts
export interface MessageSelection {
    before: string;
    selected: string;
    after: string;
}
```

### CodePropertyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L32)

```ts
export interface CodePropertyPart extends Part {
    update(state: Readonly<CodePropertyPartState>): void;
}
```

Referenced declarations: [`CodePropertyPartState`](#codepropertypartstate), [`Part`](#part).

### CodePropertyPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L31)

```ts
export interface CodePropertyPartOptions extends CodePropertyPartState {
    purpose?: 'property' | 'location';
}
```

Referenced declarations: [`CodePropertyPartState`](#codepropertypartstate).

### CodePropertyPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L30)

```ts
export interface CodePropertyPartState {
    label: string;
    value: string;
    hidden?: boolean;
}
```

### createCodePropertyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L35)

```ts
/** A literal label/code property. The two native children are its intrinsic
 * structure; no command, workspace or other business data is interpreted. */
export declare function createCodePropertyPart(options: CodePropertyPartOptions): CodePropertyPart;
```

Referenced declarations: [`CodePropertyPart`](#codepropertypart), [`CodePropertyPartOptions`](#codepropertypartoptions).

### createMetadataPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L8)

```ts
/** One native span. Counts and statuses remain caller supplied content. */
export declare function createMetadataPart(options: MetadataPartState & {
    purpose: MetadataPurpose;
}): MetadataPart;
```

Referenced declarations: [`MetadataPart`](#metadatapart), [`MetadataPartState`](#metadatapartstate), [`MetadataPurpose`](#metadatapurpose).

### MetadataPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L6)

```ts
export interface MetadataPart extends Part {
    update(state: Readonly<MetadataPartState>): void;
}
```

Referenced declarations: [`MetadataPartState`](#metadatapartstate), [`Part`](#part).

### MetadataPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L5)

```ts
export interface MetadataPartState {
    text: string;
    tone?: 'neutral' | 'active' | 'error';
    hidden?: boolean;
}
```

### MetadataPurpose

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/metadata.ts#L4)

```ts
export type MetadataPurpose = 'summary-label' | 'field-label' | 'count' | 'state' | 'trailing-state' | 'search-count';
```

### ActivityPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L55)

```ts
export interface ActivityPart extends Part {
    update(state: Readonly<ActivityPartState>): void;
}
```

Referenced declarations: [`ActivityPartState`](#activitypartstate), [`Part`](#part).

### ActivityPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L54)

```ts
export interface ActivityPartState {
    kind: 'approval' | 'running' | 'unread' | 'idle';
}
```

### BreadcrumbPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L95)

```ts
export interface BreadcrumbPart extends Part {
    update(state: Readonly<BreadcrumbPartState>): void;
}
```

Referenced declarations: [`BreadcrumbPartState`](#breadcrumbpartstate), [`Part`](#part).

### BreadcrumbPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L94)

```ts
export interface BreadcrumbPartState {
    ancestor: string;
    current: string;
}
```

### ConnectionIndicatorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L107)

```ts
export interface ConnectionIndicatorPart extends Part {
    update(state: Readonly<ConnectionIndicatorPartState>): void;
}
```

Referenced declarations: [`ConnectionIndicatorPartState`](#connectionindicatorpartstate), [`Part`](#part).

### ConnectionIndicatorPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L106)

```ts
export interface ConnectionIndicatorPartState {
    message: string;
    hidden?: boolean;
}
```

### createActivityPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L59)

```ts
/** One bounded activity mark; its glyph, color and motion are fixed by the library. */
export declare function createActivityPart(options: ActivityPartState): ActivityPart;
```

Referenced declarations: [`ActivityPart`](#activitypart), [`ActivityPartState`](#activitypartstate).

### createBreadcrumbPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L96)

```ts
export declare function createBreadcrumbPart(options: BreadcrumbPartState): BreadcrumbPart;
```

Referenced declarations: [`BreadcrumbPart`](#breadcrumbpart), [`BreadcrumbPartState`](#breadcrumbpartstate).

### createConnectionIndicatorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L109)

```ts
/** A compact waiting indicator, with a fixed warning dot and live message. */
export declare function createConnectionIndicatorPart(options: ConnectionIndicatorPartState): ConnectionIndicatorPart;
```

Referenced declarations: [`ConnectionIndicatorPart`](#connectionindicatorpart), [`ConnectionIndicatorPartState`](#connectionindicatorpartstate).

### createTreeBranchPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L29)

```ts
/** One collapsible native branch; keys, filtering and business actions remain with its caller. */
export declare function createTreeBranchPart(options: TreeBranchPartState & {
    expanded?: boolean;
    actions: readonly ButtonPart[];
    children: readonly Part[];
    onToggle?(expanded: boolean): void;
}): TreeBranchPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`Part`](#part), [`TreeBranchPart`](#treebranchpart), [`TreeBranchPartState`](#treebranchpartstate).

### createTreeItemPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L74)

```ts
/** One selectable leaf. Supplied activity/action parts keep their own identity. */
export declare function createTreeItemPart(options: TreeItemPartState & {
    status?: ActivityPart;
    actions: readonly ButtonPart[];
    onSelect?(): void;
}): TreeItemPart;
```

Referenced declarations: [`ActivityPart`](#activitypart), [`ButtonPart`](#buttonpart), [`TreeItemPart`](#treeitempart), [`TreeItemPartState`](#treeitempartstate).

### createTreePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L17)

```ts
/** A navigation landmark with direct caller-owned branches, rows and empty text. */
export declare function createTreePart(options: TreePartState & {
    children: readonly Part[];
}): TreePart;
```

Referenced declarations: [`Part`](#part), [`TreePart`](#treepart), [`TreePartState`](#treepartstate).

### TreeBranchPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L27)

```ts
export interface TreeBranchPart extends LayoutPart {
    update(state: Readonly<TreeBranchPartState>): void;
    setExpanded(expanded: boolean): void;
    isExpanded(): boolean;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`TreeBranchPartState`](#treebranchpartstate).

### TreeBranchPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L26)

```ts
export interface TreeBranchPartState {
    label: string;
    path?: string;
    selected?: boolean;
    hidden?: boolean;
}
```

### TreeItemPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L72)

```ts
export interface TreeItemPart extends Part {
    update(state: Readonly<TreeItemPartState>): void;
    setStatus(status?: ActivityPart): void;
}
```

Referenced declarations: [`ActivityPart`](#activitypart), [`Part`](#part), [`TreeItemPartState`](#treeitempartstate).

### TreeItemPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L71)

```ts
export interface TreeItemPartState {
    label: string;
    current?: boolean;
    disabled?: boolean;
    hidden?: boolean;
}
```

### TreePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L15)

```ts
export interface TreePart extends LayoutPart {
    update(state: Readonly<TreePartState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`TreePartState`](#treepartstate).

### TreePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/navigation-small.ts#L14)

```ts
export interface TreePartState {
    label: string;
    hidden?: boolean;
}
```

### createLabelledDividerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L50)

```ts
/** A labelled horizontal divider with library-owned spacing and rules. */
export declare function createLabelledDividerPart(options: {
    label: string;
}): LabelledDividerPart;
```

Referenced declarations: [`LabelledDividerPart`](#labelleddividerpart).

### createOptionActionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L19)

```ts
/** One native action with an icon, literal title/description and fixed chevron. */
export declare function createOptionActionPart(options: OptionActionOptions): OptionActionPart;
```

Referenced declarations: [`OptionActionOptions`](#optionactionoptions), [`OptionActionPart`](#optionactionpart).

### createOptionGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L42)

```ts
/** Fixed direct column. The local assembly owns keys and option ordering. */
export declare function createOptionGroupPart(options: {
    children: readonly OptionActionPart[];
}): OptionGroupPart;
```

Referenced declarations: [`OptionActionPart`](#optionactionpart), [`OptionGroupPart`](#optiongrouppart).

### createSeparatedGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L57)

```ts
/** One native block separated from preceding content by a fixed section gap. */
export declare function createSeparatedGroupPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### LabelledDividerPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L48)

```ts
export interface LabelledDividerPart extends Part {
    update(state: {
        label: string;
    }): void;
}
```

Referenced declarations: [`Part`](#part).

### OptionActionOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L9)

```ts
export interface OptionActionOptions extends OptionActionState {
    onAction?: UIAction;
    onError?(message: string): void;
}
```

Referenced declarations: [`OptionActionState`](#optionactionstate), [`UIAction`](#uiaction).

### OptionActionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L11)

```ts
export interface OptionActionPart extends Part {
    readonly [optionActionRole]: true;
    update(state: Readonly<OptionActionState>): void;
    invalidate(): void;
    focus(): void;
}
```

Referenced declarations: [`OptionActionState`](#optionactionstate), [`Part`](#part), [`optionActionRole`](#optionactionrole).

### optionActionRole

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L10)

```ts
declare const optionActionRole: unique symbol;
```

### OptionActionState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L8)

```ts
export interface OptionActionState {
    label: string;
    description: string;
    icon: IconName;
    disabled?: boolean;
    pending?: boolean;
}
```

Referenced declarations: [`IconName`](#iconname).

### OptionGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/options.ts#L37)

```ts
export interface OptionGroupPart extends Part {
    replace(children: readonly OptionActionPart[]): void;
}
```

Referenced declarations: [`OptionActionPart`](#optionactionpart), [`Part`](#part).

### MountedParts

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/ownership.ts#L8)

```ts
export interface MountedParts {
    setAppearance(appearance: Appearance): void;
    readAppearance(): Appearance;
    destroy(): void;
}
```

Referenced declarations: [`Appearance`](#appearance).

### mountParts

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/ownership.ts#L175)

```ts
/** The only public DOM input. One live tree owns a checked, ordinary container. */
export declare function mountParts(mount: HTMLElement, root: Part, options?: MountPartsOptions): MountedParts;
```

Referenced declarations: [`MountPartsOptions`](#mountpartsoptions), [`MountedParts`](#mountedparts), [`Part`](#part).

### MountPartsOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/ownership.ts#L7)

```ts
export interface MountPartsOptions {
    appearance?: Appearance;
}
```

Referenced declarations: [`Appearance`](#appearance).

### Part

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/ownership.ts#L6)

```ts
/** An opaque, library-owned part. Composition transfers its lifetime to its parent. */
export interface Part {
    readonly [partBrand]: true;
    destroy(): void;
}
```

Referenced declarations: [`partBrand`](#partbrand).

### partBrand

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/ownership.ts#L4)

```ts
declare const partBrand: unique symbol;
```

### createPaginationPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/pagination.ts#L14)

```ts
/** A controlled Previous/status/Next row, with no content or page-size policy. */
export declare function createPaginationPart(options: PaginationPartOptions): PaginationPart;
```

Referenced declarations: [`PaginationPart`](#paginationpart), [`PaginationPartOptions`](#paginationpartoptions).

### PaginationPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/pagination.ts#L7)

```ts
export interface PaginationPart extends Part {
    update(state: Readonly<PaginationPartState>): void;
}
```

Referenced declarations: [`PaginationPartState`](#paginationpartstate), [`Part`](#part).

### PaginationPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/pagination.ts#L6)

```ts
export interface PaginationPartOptions extends PaginationPartState {
    onPage(page: number): void;
}
```

Referenced declarations: [`PaginationPartState`](#paginationpartstate).

### PaginationPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/pagination.ts#L5)

```ts
export interface PaginationPartState {
    page: number;
    total: number;
    note?: string;
}
```

### ContentViewportContent

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/preview-layout.ts#L4)

```ts
export type ContentViewportContent = string | readonly Part[] | {
    readonly message: string;
    readonly children: readonly Part[];
};
```

Referenced declarations: [`Part`](#part).

### ContentViewportOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/preview-layout.ts#L6)

```ts
export interface ContentViewportOptions {
    purpose: 'preview' | 'inspector' | 'plain';
    onDispose?(): void;
    content: ContentViewportContent;
    announce?: 'none' | 'polite';
}
```

Referenced declarations: [`ContentViewportContent`](#contentviewportcontent).

### ContentViewportPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/preview-layout.ts#L5)

```ts
export interface ContentViewportPart extends Part {
    replace(content: ContentViewportContent): void;
}
```

Referenced declarations: [`ContentViewportContent`](#contentviewportcontent), [`Part`](#part).

### createContentViewportPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/preview-layout.ts#L8)

```ts
/** A bounded content region. Literal loading/error text adds no wrapper. */
export declare function createContentViewportPart(options: ContentViewportOptions): ContentViewportPart;
```

Referenced declarations: [`ContentViewportOptions`](#contentviewportoptions), [`ContentViewportPart`](#contentviewportpart).

### createTrailingActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/preview-layout.ts#L40)

```ts
/** A trailing row owns only placement; callers compose their own action group. */
export declare function createTrailingActionsPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createProgressPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/progress.ts#L12)

```ts
/** A native percentage progress track. Dimensions and accent belong to the library. */
export declare function createProgressPart(options: ProgressPartState): ProgressPart;
```

Referenced declarations: [`ProgressPart`](#progresspart), [`ProgressPartState`](#progresspartstate).

### ProgressPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/progress.ts#L4)

```ts
export interface ProgressPart extends Part {
    update(state: Readonly<ProgressPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`ProgressPartState`](#progresspartstate).

### ProgressPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/progress.ts#L3)

```ts
export interface ProgressPartState {
    label: string;
    value: number;
    hidden?: boolean;
}
```

### createReadingRegionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reader-layout.ts#L14)

```ts
/** One flex reading region; the caller supplies viewport and floating action. */
export declare function createReadingRegionPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createSearchToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reader-layout.ts#L7)

```ts
/** A native search row. Caller parts supply its field, count and actions. */
export declare function createSearchToolbarPart(options: SearchToolbarPartState & {
    children: readonly Part[];
}): SearchToolbarPart;
```

Referenced declarations: [`Part`](#part), [`SearchToolbarPart`](#searchtoolbarpart), [`SearchToolbarPartState`](#searchtoolbarpartstate).

### SearchToolbarPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reader-layout.ts#L5)

```ts
export interface SearchToolbarPart extends LayoutPart {
    update(state: Readonly<SearchToolbarPartState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`SearchToolbarPartState`](#searchtoolbarpartstate).

### SearchToolbarPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reader-layout.ts#L4)

```ts
export interface SearchToolbarPartState {
    hidden?: boolean;
}
```

### createReadingViewportPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading-viewport.ts#L18)

```ts
/** One native reading section. Search controls and all content are caller parts. */
export declare function createReadingViewportPart(options: ReadingViewportOptions): ReadingViewportPart;
```

Referenced declarations: [`ReadingViewportOptions`](#readingviewportoptions), [`ReadingViewportPart`](#readingviewportpart).

### ReadingViewportOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading-viewport.ts#L6)

```ts
export interface ReadingViewportOptions {
    reading: ReadingColumnPart;
    children: readonly Part[];
    onSearchState?(state: ReadingSearchState): void;
    onLatestChange?(visible: boolean): void;
    onSearchIntent?(intent: 'open' | 'close'): void;
}
```

Referenced declarations: [`Part`](#part), [`ReadingColumnPart`](#readingcolumnpart), [`ReadingSearchState`](#readingsearchstate).

### ReadingViewportPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading-viewport.ts#L12)

```ts
export interface ReadingViewportPart extends Part {
    beforeUpdate(key: string): void;
    afterUpdate(): void;
    prune(keys: readonly string[]): void;
    followLatest(): void;
    openSearch(query?: string): void;
    closeSearch(): void;
    search(query: string): void;
    moveMatch(direction: 'next' | 'previous'): void;
    focus(): void;
}
```

Referenced declarations: [`Part`](#part).

### BubblePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L26)

```ts
export interface BubblePart extends LayoutPart {
    update(state: Readonly<BubblePartState>): void;
}
```

Referenced declarations: [`BubblePartState`](#bubblepartstate), [`LayoutPart`](#layoutpart).

### BubblePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L25)

```ts
export interface BubblePartState {
    speaker: 'self' | 'agent';
}
```

### createBubblePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L28)

```ts
/** One article and its existing intrinsic body; no implicit text or actions. */
export declare function createBubblePart(options: BubblePartState & {
    key: string;
    children: readonly Part[];
}): BubblePart;
```

Referenced declarations: [`BubblePart`](#bubblepart), [`BubblePartState`](#bubblepartstate), [`Part`](#part).

### createImageGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L42)

```ts
/** A native image gallery. Images are independent caller-composed parts. */
export declare function createImageGroupPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createMessageActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L40)

```ts
export declare function createMessageActionsPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createMessageFooterPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L39)

```ts
/** Metadata and actions stay separate from the reading bubble itself. */
export declare function createMessageFooterPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createReadingColumnPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L16)

```ts
export declare function createReadingColumnPart(options: {
    children: readonly Part[];
    hidden?: boolean;
    onDispose?(): void;
}): ReadingColumnPart;
```

Referenced declarations: [`Part`](#part), [`ReadingColumnPart`](#readingcolumnpart).

### createReadingNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L45)

```ts
export declare function createReadingNotePart(options: {
    key: string;
    text: string;
}): ReadingNotePart;
```

Referenced declarations: [`ReadingNotePart`](#readingnotepart).

### createTimestampPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L55)

```ts
export declare function createTimestampPart(options: {
    value: number;
}): TimestampPart;
```

Referenced declarations: [`TimestampPart`](#timestamppart).

### createWorkingIndicatorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L63)

```ts
export declare function createWorkingIndicatorPart(options?: WorkingIndicatorPartState): WorkingIndicatorPart;
```

Referenced declarations: [`WorkingIndicatorPart`](#workingindicatorpart), [`WorkingIndicatorPartState`](#workingindicatorpartstate).

### ReadingColumnPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L12)

```ts
/** A bounded reading column. Every message and status remains caller-composed. */
export interface ReadingColumnPart extends LayoutPart {
    update(state: {
        hidden: boolean;
    }): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### ReadingNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L44)

```ts
export interface ReadingNotePart extends Part {
    update(state: {
        text: string;
    }): void;
}
```

Referenced declarations: [`Part`](#part).

### TimestampPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L54)

```ts
export interface TimestampPart extends Part {
    update(state: {
        value: number;
    }): void;
}
```

Referenced declarations: [`Part`](#part).

### WorkingIndicatorPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L62)

```ts
export interface WorkingIndicatorPart extends Part {
    update(state: Readonly<WorkingIndicatorPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`WorkingIndicatorPartState`](#workingindicatorpartstate).

### WorkingIndicatorPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/reading.ts#L61)

```ts
export interface WorkingIndicatorPartState {
    label?: string;
    hidden?: boolean;
}
```

### createScrollAreaPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/scroll-area.ts#L6)

```ts
/** A fixed metrics scroller. Its bounds and scrollbar rules stay in the library. */
export declare function createScrollAreaPart(options: {
    purpose: 'metrics';
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createSearchFieldPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/search.ts#L13)

```ts
/** A native containing search label. Its one icon and input use the fixed rail specification. */
export declare function createSearchFieldPart(options: SearchFieldPartOptions): SearchFieldPart;
```

Referenced declarations: [`SearchFieldPart`](#searchfieldpart), [`SearchFieldPartOptions`](#searchfieldpartoptions).

### SearchFieldPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/search.ts#L7)

```ts
export interface SearchFieldPart extends Part {
    update(state: Readonly<SearchFieldPartState>): void;
    read(): string;
    reset(value: string): void;
    focus(): void;
}
```

Referenced declarations: [`Part`](#part), [`SearchFieldPartState`](#searchfieldpartstate).

### SearchFieldPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/search.ts#L6)

```ts
export interface SearchFieldPartOptions extends SearchFieldPartState {
    value?: string;
    onInput?(value: string): void;
}
```

Referenced declarations: [`SearchFieldPartState`](#searchfieldpartstate).

### SearchFieldPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/search.ts#L5)

```ts
export interface SearchFieldPartState {
    label: string;
    placeholder?: string;
    disabled?: boolean;
    hidden?: boolean;
}
```

### createSecretLabelPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/secret-label.ts#L15)

```ts
/** A label and visibility action for a borrowed secret textarea. The control
 * remains its own native part; this adds only the original useful heading row. */
export declare function createSecretLabelPart(options: SecretLabelPartOptions): SecretLabelPart;
```

Referenced declarations: [`SecretLabelPart`](#secretlabelpart), [`SecretLabelPartOptions`](#secretlabelpartoptions).

### SecretLabelPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/secret-label.ts#L7)

```ts
export interface SecretLabelPart extends Part {
    update(state: Readonly<SecretLabelPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`SecretLabelPartState`](#secretlabelpartstate).

### SecretLabelPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/secret-label.ts#L6)

```ts
export interface SecretLabelPartOptions extends SecretLabelPartState {
    control: ValuePart;
    onToggle?(revealed: boolean): void;
}
```

Referenced declarations: [`SecretLabelPartState`](#secretlabelpartstate), [`ValuePart`](#valuepart).

### SecretLabelPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/secret-label.ts#L5)

```ts
export interface SecretLabelPartState {
    label: string;
    revealed?: boolean;
    hidden?: boolean;
}
```

### createSelectableCardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/selectable-card.ts#L7)

```ts
/** One native outlined article. Its caller composes all content and actions. */
export declare function createSelectableCardPart(options: SelectableCardState & {
    children: readonly Part[];
}): SelectableCardPart;
```

Referenced declarations: [`Part`](#part), [`SelectableCardPart`](#selectablecardpart), [`SelectableCardState`](#selectablecardstate).

### SelectableCardPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/selectable-card.ts#L5)

```ts
export interface SelectableCardPart extends LayoutPart {
    update(state: Readonly<SelectableCardState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`SelectableCardState`](#selectablecardstate).

### SelectableCardState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/selectable-card.ts#L4)

```ts
export interface SelectableCardState {
    selected?: boolean;
}
```

### createStatusActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status-actions.ts#L6)

```ts
/** One inline status/action row. The caller supplies its text and action parts. */
export declare function createStatusActionsPart(options: {
    children: readonly Part[];
    hidden?: boolean;
}): StatusActionsPart;
```

Referenced declarations: [`Part`](#part), [`StatusActionsPart`](#statusactionspart).

### StatusActionsPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status-actions.ts#L4)

```ts
export interface StatusActionsPart extends LayoutPart {
    update(state: {
        hidden?: boolean;
    }): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### BadgePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L4)

```ts
export interface BadgePart extends Part {
    update(state: Readonly<BadgePartState>): void;
}
```

Referenced declarations: [`BadgePartState`](#badgepartstate), [`Part`](#part).

### BadgePartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L5)

```ts
export interface BadgePartOptions extends BadgePartState {
    purpose?: 'outline' | 'filled' | 'code';
}
```

Referenced declarations: [`BadgePartState`](#badgepartstate).

### BadgePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L3)

```ts
export interface BadgePartState {
    text: string;
    hidden?: boolean;
}
```

### createBadgePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L15)

```ts
/** A small text badge. Its border, spacing and type are fixed by the library. */
export declare function createBadgePart(options: BadgePartOptions): BadgePart;
```

Referenced declarations: [`BadgePart`](#badgepart), [`BadgePartOptions`](#badgepartoptions).

### createStatusPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L37)

```ts
/** A live inline result. Empty content takes no space; typography and tones are library-owned. */
export declare function createStatusPart(options: StatusPartOptions): StatusPart;
```

Referenced declarations: [`StatusPart`](#statuspart), [`StatusPartOptions`](#statuspartoptions).

### StatusPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L29)

```ts
export interface StatusPart extends Part {
    update(state: Readonly<StatusPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`StatusPartState`](#statuspartstate).

### StatusPartOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L28)

```ts
export interface StatusPartOptions extends StatusPartState {
    presentation?: 'inline' | 'paragraph';
}
```

Referenced declarations: [`StatusPartState`](#statuspartstate).

### StatusPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/status.ts#L27)

```ts
export interface StatusPartState {
    message: string;
    tone?: 'neutral' | 'success' | 'error';
    hidden?: boolean;
}
```

### createFieldGridPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L31)

```ts
/** The library's fixed two-column field grid; children retain their own identity. */
export declare function createFieldGridPart(options: FieldGridPartState & {
    children: readonly Part[];
}): FieldGridPart;
```

Referenced declarations: [`FieldGridPart`](#fieldgridpart), [`FieldGridPartState`](#fieldgridpartstate), [`Part`](#part).

### createFieldsetPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L13)

```ts
/** A native legend group. Disabling is inherited by its existing controls. */
export declare function createFieldsetPart(options: FieldsetPartState & {
    children: readonly Part[];
}): FieldsetPart;
```

Referenced declarations: [`FieldsetPart`](#fieldsetpart), [`FieldsetPartState`](#fieldsetpartstate), [`Part`](#part).

### createInputAdornmentPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L52)

```ts
/** The existing icon/input container; ordinary inputs receive no extra wrapper. */
export declare function createInputAdornmentPart(options: InputAdornmentPartState & {
    control: ValuePart;
}): InputAdornmentPart;
```

Referenced declarations: [`InputAdornmentPart`](#inputadornmentpart), [`InputAdornmentPartState`](#inputadornmentpartstate), [`ValuePart`](#valuepart).

### FieldGridPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L29)

```ts
export interface FieldGridPart extends Part {
    update(state: Readonly<FieldGridPartState>): void;
    replace(children: readonly Part[]): void;
}
```

Referenced declarations: [`FieldGridPartState`](#fieldgridpartstate), [`Part`](#part).

### FieldGridPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L28)

```ts
export interface FieldGridPartState {
    hidden?: boolean;
}
```

### FieldsetPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L7)

```ts
export interface FieldsetPart extends Part {
    update(state: Readonly<FieldsetPartState>): void;
    replace(children: readonly Part[]): void;
}
```

Referenced declarations: [`FieldsetPartState`](#fieldsetpartstate), [`Part`](#part).

### FieldsetPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L6)

```ts
export interface FieldsetPartState {
    legend: string;
    disabled?: boolean;
    hidden?: boolean;
}
```

### InputAdornmentPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L46)

```ts
export interface InputAdornmentPart extends Part {
    update(state: Readonly<InputAdornmentPartState>): void;
}
```

Referenced declarations: [`InputAdornmentPartState`](#inputadornmentpartstate), [`Part`](#part).

### InputAdornmentPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/structure.ts#L45)

```ts
export interface InputAdornmentPartState {
    icon: IconName;
    hidden?: boolean;
}
```

Referenced declarations: [`IconName`](#iconname).

### createTablePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/table.ts#L29)

```ts
/** A fixed native table with text headers and genuine, explicitly composed rows. */
export declare function createTablePart(options: {
    headers: readonly string[];
    rows: readonly TableRowPart[];
    emptyLabel: string;
}): TablePart;
```

Referenced declarations: [`TablePart`](#tablepart), [`TableRowPart`](#tablerowpart).

### createTableRowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/table.ts#L9)

```ts
/** Native cells contain either literal text or opaque child parts. */
export declare function createTableRowPart(options: {
    cells: readonly (string | readonly Part[])[];
}): TableRowPart;
```

Referenced declarations: [`Part`](#part), [`TableRowPart`](#tablerowpart).

### TablePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/table.ts#L5)

```ts
export interface TablePart extends Part {
    replaceRows(rows: readonly TableRowPart[]): void;
}
```

Referenced declarations: [`Part`](#part), [`TableRowPart`](#tablerowpart).

### tableRowBrand

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/table.ts#L3)

```ts
declare const tableRowBrand: unique symbol;
```

### TableRowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/table.ts#L4)

```ts
export interface TableRowPart extends Part {
    readonly [tableRowBrand]: true;
    update(state: {
        cells: readonly (string | undefined)[];
    }): void;
}
```

Referenced declarations: [`Part`](#part), [`tableRowBrand`](#tablerowbrand).

### createTextFlowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text-flow.ts#L20)

```ts
/** A literal text flow with native strong emphasis, never HTML or per-word spans. */
export declare function createTextFlowPart(options: TextFlowPartState & {
    role?: TextFlowRole;
}): TextFlowPart;
```

Referenced declarations: [`TextFlowPart`](#textflowpart), [`TextFlowPartState`](#textflowpartstate), [`TextFlowRole`](#textflowrole).

### TextFlowPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text-flow.ts#L7)

```ts
export interface TextFlowPart extends Part {
    update(state: Readonly<TextFlowPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`TextFlowPartState`](#textflowpartstate).

### TextFlowPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text-flow.ts#L5)

```ts
export interface TextFlowPartState {
    segments: readonly TextFlowSegment[];
    hidden?: boolean;
}
```

Referenced declarations: [`TextFlowSegment`](#textflowsegment).

### TextFlowRole

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text-flow.ts#L6)

```ts
export type TextFlowRole = 'paragraph' | 'description' | 'hint' | 'inline';
```

### TextFlowSegment

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text-flow.ts#L4)

```ts
export interface TextFlowSegment {
    text: string;
    emphasis?: 'strong';
}
```

### ContextNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L51)

```ts
export interface ContextNotePart extends TextPart {
    update(state: Readonly<ContextNotePartState>): void;
}
```

Referenced declarations: [`ContextNotePartState`](#contextnotepartstate), [`TextPart`](#textpart).

### ContextNotePartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L50)

```ts
export interface ContextNotePartState extends TextPartState {
    tone?: 'neutral' | 'warning';
}
```

Referenced declarations: [`TextPartState`](#textpartstate).

### createContextNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L54)

```ts
/** A short centered context hint with one bounded warning state. It is a
 * genuine text part and can describe a separate control without a wrapper. */
export declare function createContextNotePart(options: ContextNotePartState & {
    purpose?: 'context' | 'attachment-guidance';
}): ContextNotePart;
```

Referenced declarations: [`ContextNotePart`](#contextnotepart), [`ContextNotePartState`](#contextnotepartstate).

### createIconPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L77)

```ts
/** SVG is the part root, so composing an icon never adds a span wrapper. */
export declare function createIconPart(options: IconPartState): IconPart;
```

Referenced declarations: [`IconPart`](#iconpart), [`IconPartState`](#iconpartstate).

### createLineBreakPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L100)

```ts
/** A native line break with no presentation options or wrapper. */
export declare function createLineBreakPart(options?: Record<string, never>): Part;
```

Referenced declarations: [`Part`](#part).

### createTextPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L29)

```ts
/** A single semantic text node; the library owns its tag and presentation. */
export declare function createTextPart(options: TextPartState & {
    role?: TextRole;
}): TextPart;
```

Referenced declarations: [`TextPart`](#textpart), [`TextPartState`](#textpartstate), [`TextRole`](#textrole).

### IconName

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L6)

```ts
export type IconName = typeof iconNames[number];
```

Referenced declarations: [`iconNames`](#iconnames).

### iconNames

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L5)

```ts
export declare const iconNames: readonly [
    "steer",
    "edit",
    "trash",
    "branch",
    "compress",
    "image",
    "plus",
    "chat",
    "folder",
    "settings",
    "arrow",
    "stop",
    "chevron",
    "down",
    "close",
    "check",
    "shield",
    "file",
    "terminal",
    "copy",
    "menu",
    "globe",
    "search",
    "more",
    "compose",
    "plug"
];
```

### IconPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L75)

```ts
export interface IconPart extends Part {
    update(state: Readonly<IconPartState>): void;
}
```

Referenced declarations: [`IconPartState`](#iconpartstate), [`Part`](#part).

### IconPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L74)

```ts
export interface IconPartState {
    name: IconName;
    label?: string;
    hidden?: boolean;
}
```

Referenced declarations: [`IconName`](#iconname).

### TextPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L13)

```ts
export interface TextPart extends Part {
    update(state: Readonly<TextPartState>): void;
}
```

Referenced declarations: [`Part`](#part), [`TextPartState`](#textpartstate).

### TextPartState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L11)

```ts
export interface TextPartState {
    text: string;
    hidden?: boolean;
    announce?: 'none' | 'polite';
}
```

### TextRole

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/text.ts#L12)

```ts
export type TextRole = 'text' | 'small' | 'paragraph' | 'muted' | 'muted-paragraph' | 'path' | 'path-paragraph' | 'location' | 'footnote' | 'warning-paragraph' | 'scope-note' | 'surface-status' | 'note' | 'caption' | 'hint' | 'description' | 'eyebrow' | 'eyebrow-paragraph' | 'heading' | 'display-heading' | 'strong' | 'screenreader' | 'bubble' | 'interrupted' | 'section-title';
```

### CaptionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L8)

```ts
export interface CaptionPart extends Part {
    update(state: Readonly<{
        text: string;
    }>): void;
}
```

Referenced declarations: [`Part`](#part).

### createCaptionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L38)

```ts
/** Literal native caption text, without a span or markup port. */
export declare function createCaptionPart(options: {
    text: string;
}): CaptionPart;
```

Referenced declarations: [`CaptionPart`](#captionpart).

### createThumbnailPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L31)

```ts
/** A native thumbnail figure. Images, captions and actions are caller-composed. */
export declare function createThumbnailPart(options: {
    children: readonly Part[];
}): ThumbnailPart;
```

Referenced declarations: [`Part`](#part), [`ThumbnailPart`](#thumbnailpart).

### createThumbnailStripPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L17)

```ts
/** One native horizontal strip. The library fixes thumbnail sizing and overflow. */
export declare function createThumbnailStripPart(options: ThumbnailStripOptions): ThumbnailStripPart;
```

Referenced declarations: [`ThumbnailStripOptions`](#thumbnailstripoptions), [`ThumbnailStripPart`](#thumbnailstrippart).

### ThumbnailPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L7)

```ts
export interface ThumbnailPart extends LayoutPart {
}
```

Referenced declarations: [`LayoutPart`](#layoutpart).

### ThumbnailStripOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L5)

```ts
export interface ThumbnailStripOptions extends ThumbnailStripState {
    children: readonly Part[];
    onDispose?(): void;
}
```

Referenced declarations: [`Part`](#part), [`ThumbnailStripState`](#thumbnailstripstate).

### ThumbnailStripPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L6)

```ts
export interface ThumbnailStripPart extends LayoutPart {
    update(state: Readonly<ThumbnailStripState>): void;
}
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`ThumbnailStripState`](#thumbnailstripstate).

### ThumbnailStripState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/thumbnail.ts#L4)

```ts
export interface ThumbnailStripState {
    label?: string;
    hidden?: boolean;
}
```

### createEmblemPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/toast.ts#L23)

```ts
/** A fixed success emblem. Shape, icon and size are library-owned. */
export declare function createEmblemPart(options: {
    tone: 'success';
}): Part;
```

Referenced declarations: [`Part`](#part).

### createToastBodyPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/toast.ts#L21)

```ts
/** The flexible content slot leaves the emblem and dismissal as direct siblings. */
export declare function createToastBodyPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createToastPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/toast.ts#L19)

```ts
/** One native notification card; callers supply its actual small parts. */
export declare function createToastPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createToastStackPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/toast.ts#L10)

```ts
/** A fixed, nonmodal notification stack. Content and its lifetime are owned once. */
export declare function createToastStackPart(options: {
    label: string;
    children: readonly Part[];
    onDispose?(): void;
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createWarningPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/warning.ts#L6)

```ts
/** A bounded warning surface. Its icon, literal text and actions are composed
 * separately, and it introduces no content or additional wrapper. */
export declare function createWarningPart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### CenteredContentPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L12)

```ts
export interface CenteredContentPart extends LayoutPart {
    update(state: Readonly<CenteredContentState>): void;
}
```

Referenced declarations: [`CenteredContentState`](#centeredcontentstate), [`LayoutPart`](#layoutpart).

### CenteredContentState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L11)

```ts
export interface CenteredContentState {
    hidden?: boolean;
}
```

### createBrandTilePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L24)

```ts
/** One fixed emblem tile, with the genuine mark as its direct child. */
export declare function createBrandTilePart(options: {
    mark: BrandMarkPart;
}): Part;
```

Referenced declarations: [`BrandMarkPart`](#brandmarkpart), [`Part`](#part).

### createCenteredContentPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L14)

```ts
/** An empty centered content column. All text, controls and branching are caller parts. */
export declare function createCenteredContentPart(options: CenteredContentState & {
    children: readonly Part[];
    onDispose?(): void;
}): CenteredContentPart;
```

Referenced declarations: [`CenteredContentPart`](#centeredcontentpart), [`CenteredContentState`](#centeredcontentstate), [`Part`](#part).

### createContextLinePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L87)

```ts
/** A short inline context row with independently composed content and actions. */
export declare function createContextLinePart(options: {
    children: readonly Part[];
}): LayoutPart;
```

Referenced declarations: [`LayoutPart`](#layoutpart), [`Part`](#part).

### createIconNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L104)

```ts
/** One icon and literal note in the library's fixed quiet line presentation. */
export declare function createIconNotePart(options: IconNoteState): IconNotePart;
```

Referenced declarations: [`IconNotePart`](#iconnotepart), [`IconNoteState`](#iconnotestate).

### createResponsiveLeadPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L32)

```ts
/** Literal content lines separated by the library's fixed responsive break. */
export declare function createResponsiveLeadPart(options: ResponsiveLeadState): ResponsiveLeadPart;
```

Referenced declarations: [`ResponsiveLeadPart`](#responsiveleadpart), [`ResponsiveLeadState`](#responsiveleadstate).

### createStepActionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L52)

```ts
/** One native rich action. The leading number/check and chevron are intrinsic. */
export declare function createStepActionPart(options: StepActionOptions): StepActionPart;
```

Referenced declarations: [`StepActionOptions`](#stepactionoptions), [`StepActionPart`](#stepactionpart).

### createStepGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L76)

```ts
/** A small titled group. It supplies no setup workflow, model or workspace data. */
export declare function createStepGroupPart(options: StepGroupState & {
    children: readonly StepActionPart[];
}): StepGroupPart;
```

Referenced declarations: [`StepActionPart`](#stepactionpart), [`StepGroupPart`](#stepgrouppart), [`StepGroupState`](#stepgroupstate).

### createSuggestionGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L90)

```ts
/** A wrapping group of genuine ordinary actions, without implicit suggestions. */
export declare function createSuggestionGroupPart(options: {
    children: readonly ButtonPart[];
}): SuggestionGroupPart;
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`SuggestionGroupPart`](#suggestiongrouppart).

### IconNotePart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L102)

```ts
export interface IconNotePart extends Part {
    update(state: Readonly<IconNoteState>): void;
}
```

Referenced declarations: [`IconNoteState`](#iconnotestate), [`Part`](#part).

### IconNoteState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L101)

```ts
export interface IconNoteState {
    icon: IconName;
    text: string;
}
```

Referenced declarations: [`IconName`](#iconname).

### ResponsiveLeadPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L30)

```ts
export interface ResponsiveLeadPart extends Part {
    update(state: Readonly<ResponsiveLeadState>): void;
}
```

Referenced declarations: [`Part`](#part), [`ResponsiveLeadState`](#responsiveleadstate).

### ResponsiveLeadState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L29)

```ts
export interface ResponsiveLeadState {
    lines: readonly string[];
}
```

### StepActionOptions

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L44)

```ts
export interface StepActionOptions extends StepActionState {
    onAction?: UIAction;
    onError?(message: string): void;
}
```

Referenced declarations: [`StepActionState`](#stepactionstate), [`UIAction`](#uiaction).

### StepActionPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L43)

```ts
export interface StepActionPart extends Part {
    readonly [stepActionRole]: true;
    update(state: Readonly<StepActionState>): void;
    focus(): void;
    invalidate(): void;
}
```

Referenced declarations: [`Part`](#part), [`StepActionState`](#stepactionstate), [`stepActionRole`](#stepactionrole).

### stepActionRole

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L42)

```ts
declare const stepActionRole: unique symbol;
```

### StepActionState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L41)

```ts
export interface StepActionState {
    step: string;
    completed: boolean;
    label: string;
    description: string;
    disabled?: boolean;
}
```

### StepGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L71)

```ts
export interface StepGroupPart extends Part {
    update(state: Readonly<StepGroupState>): void;
    replace(children: readonly StepActionPart[]): void;
}
```

Referenced declarations: [`Part`](#part), [`StepActionPart`](#stepactionpart), [`StepGroupState`](#stepgroupstate).

### StepGroupState

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L70)

```ts
export interface StepGroupState {
    title: string;
    summary: string;
}
```

### SuggestionGroupPart

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/parts/welcome-parts.ts#L88)

```ts
export interface SuggestionGroupPart extends Part {
    replace(children: readonly ButtonPart[]): void;
}
```

Referenced declarations: [`ButtonPart`](#buttonpart), [`Part`](#part).

### Appearance

[Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/theme.ts#L1)

```ts
export type Appearance = 'light' | 'dark' | 'system';
```

## Shared recipes

Import these regions, state and callback types from `pith-ui/recipes`. Their installed declarations preserve the exact signatures and inferred handles. The host owns business decisions and requests; recipes own UI state and lifetime. See [APP.md](./APP.md). No whole application or standalone mount wrapper is exported.

| Export | Declaration source |
|---|---|
| `Appearance` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L11) |
| `Approval` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/approval.ts#L10) |
| `ApprovalComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/approval.ts#L12) |
| `ApprovalState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/approval.ts#L11) |
| `ArtifactActionResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L16) |
| `ArtifactsCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L17) |
| `ArtifactsComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L22) |
| `ArtifactsDependencies` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L21) |
| `ArtifactsState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L11) |
| `ArtifactTarget` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L15) |
| `AttachmentItem` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/attachments.ts#L7) |
| `AttachmentsCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/attachments.ts#L9) |
| `AttachmentsComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/attachments.ts#L10) |
| `AttachmentsState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/attachments.ts#L8) |
| `BodyMessage` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L12) |
| `BodyResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L15) |
| `CompletionNoticeDisplay` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/completion-notices.ts#L4) |
| `CompletionNoticesComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/completion-notices.ts#L5) |
| `composeApproval` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/approval.ts#L28) |
| `composeArtifacts` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/artifacts.ts#L29) |
| `composeAttachments` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/attachments.ts#L14) |
| `composeBranchHistory` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L17) |
| `composeCompletionNotices` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/completion-notices.ts#L7) |
| `composeComposer` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/composer.ts#L11) |
| `composeConfirmation` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L32) |
| `composeConversationBody` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L23) |
| `composeConversationReader` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-reader.ts#L16) |
| `composeCostLedger` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L15) |
| `composeCustomConnection` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L21) |
| `composeCustomConnectionLoading` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L82) |
| `composeFilePreview` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L33) |
| `composeFrame` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L49) |
| `composeFullAccess` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L18) |
| `composeImageViewer` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/image-viewer.ts#L18) |
| `composeMCPConnections` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L29) |
| `composeModelPicker` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L47) |
| `composePendingMessages` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/pending-messages.ts#L14) |
| `composePermissionControl` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/permission-control.ts#L7) |
| `composeProviderLogin` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/provider-login.ts#L19) |
| `ComposerCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/composer.ts#L9) |
| `ComposerComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/composer.ts#L10) |
| `composeRename` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L25) |
| `composeResourceEditor` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L42) |
| `composeResourceLoading` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L135) |
| `composeResourcesInventory` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L64) |
| `ComposerState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/composer.ts#L7) |
| `composeRuntime` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/runtime.ts#L8) |
| `composeSettings` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L49) |
| `composeTaskFailure` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/task-failure.ts#L9) |
| `composeTextEditor` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L42) |
| `composeToolGroup` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/tool-disclosures.ts#L22) |
| `composeWelcome` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/welcome.ts#L20) |
| `composeWorkspacePicker` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L26) |
| `ConfirmationAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L22) |
| `ConfirmationCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L21) |
| `ConfirmationComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L29) |
| `ConfirmationResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L20) |
| `ConfirmationState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/confirmation.ts#L9) |
| `ConversationBodyCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L16) |
| `ConversationBodyComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L18) |
| `ConversationBodyState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L13) |
| `ConversationHostAvailability` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L17) |
| `ConversationImageScope` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L7) |
| `ConversationReaderComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-reader.ts#L8) |
| `CostLedgerComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L7) |
| `CostLedgerState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L5) |
| `CostRequestDisplay` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L4) |
| `CostSummaryDisplay` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L6) |
| `createConversationImageScope` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L11) |
| `createDialogHost` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/dialog-host.ts#L23) |
| `CustomConnectionAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L16) |
| `CustomConnectionCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L15) |
| `CustomConnectionComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L17) |
| `CustomConnectionDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L14) |
| `CustomConnectionState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L12) |
| `CustomLoadingAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L80) |
| `CustomLoadingComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L81) |
| `CustomLoadingState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L79) |
| `CustomModel` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L9) |
| `customModelDefaults` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L11) |
| `CustomModelDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/custom-connection.ts#L13) |
| `DialogHost` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/dialog-host.ts#L16) |
| `DialogHostOptions` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/dialog-host.ts#L11) |
| `DialogOpening` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/dialog-host.ts#L5) |
| `FailureAction` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/task-failure.ts#L4) |
| `FilePreviewAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L24) |
| `FilePreviewComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L28) |
| `formatCost` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/cost-ledger.ts#L10) |
| `FrameAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L42) |
| `FrameCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L25) |
| `FrameComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L47) |
| `FrameContent` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L33) |
| `FrameConversation` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L14) |
| `FrameState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L19) |
| `FrameWorkspace` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/frame.ts#L18) |
| `FullAccessAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L13) |
| `FullAccessCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L12) |
| `FullAccessComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L14) |
| `FullAccessResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L11) |
| `FullAccessState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/full-access.ts#L10) |
| `GalleryCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L5) |
| `HistoryAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L12) |
| `HistoryCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L11) |
| `HistoryComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L13) |
| `HistoryNode` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L8) |
| `HistoryResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L10) |
| `HistoryState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/branch-history.ts#L9) |
| `ImageGalleryComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L6) |
| `ImageReference` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L4) |
| `ImageTarget` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-images.ts#L3) |
| `ImageViewerCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/image-viewer.ts#L8) |
| `ImageViewerComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/image-viewer.ts#L9) |
| `ImageViewerInput` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/image-viewer.ts#L7) |
| `InventoryCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L23) |
| `InventoryState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L11) |
| `MCPAction` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L16) |
| `MCPAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L22) |
| `MCPCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L17) |
| `MCPComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L27) |
| `MCPConnection` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L15) |
| `MCPDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L14) |
| `MCPEditor` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L13) |
| `MCPState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/mcp.ts#L12) |
| `MessageAction` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/conversation-body.ts#L14) |
| `ModelCatalog` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L20) |
| `ModelEntry` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L16) |
| `ModelPickerAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L32) |
| `ModelPickerCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L28) |
| `ModelPickerComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L41) |
| `ModelPickerState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L26) |
| `ModelProvider` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L15) |
| `ModelSelection` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L14) |
| `PendingCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/pending-messages.ts#L8) |
| `PendingComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/pending-messages.ts#L9) |
| `PendingItem` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/pending-messages.ts#L6) |
| `PendingState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/pending-messages.ts#L7) |
| `PermissionComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/permission-control.ts#L5) |
| `PermissionState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/permission-control.ts#L4) |
| `PickerWorkspace` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L10) |
| `PreviewCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L17) |
| `PreviewInput` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L16) |
| `PreviewKind` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L12) |
| `previewPageBytes` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/preview-pages.ts#L2) |
| `previewPageRanges` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/preview-pages.ts#L3) |
| `PreviewResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L13) |
| `PreviewState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L14) |
| `PreviewTarget` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/file-preview.ts#L15) |
| `ProviderAction` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L20) |
| `ProviderActions` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L19) |
| `ProviderLoginAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/provider-login.ts#L16) |
| `ProviderLoginCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/provider-login.ts#L10) |
| `ProviderLoginComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/provider-login.ts#L17) |
| `ProviderLoginState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/provider-login.ts#L9) |
| `RecipeResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/types.ts#L3) |
| `RenameAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L13) |
| `RenameCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L12) |
| `RenameComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L22) |
| `RenameDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L10) |
| `RenameResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L11) |
| `RenameState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/rename.ts#L9) |
| `ResourceActionResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L22) |
| `ResourceCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L25) |
| `ResourceDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L24) |
| `ResourceEditorAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L30) |
| `ResourceEditorComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L38) |
| `ResourceEntry` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L10) |
| `ResourceInventoryAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L31) |
| `ResourceInventoryComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-inventory.ts#L39) |
| `ResourceKind` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/types.ts#L4) |
| `ResourceLoadingAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L125) |
| `ResourceLoadingComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L132) |
| `ResourceLoadingState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L124) |
| `ResourceResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L9) |
| `ResourceState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/resource-editor.ts#L10) |
| `ResourceTarget` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/types.ts#L5) |
| `RuntimeComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/runtime.ts#L5) |
| `RuntimeState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/runtime.ts#L4) |
| `SettingsAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L33) |
| `SettingsCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L23) |
| `SettingsComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L42) |
| `SettingsCredential` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L21) |
| `SettingsDraft` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L17) |
| `SettingsProvider` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L18) |
| `SettingsState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L13) |
| `TaskFailureCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/task-failure.ts#L6) |
| `TaskFailureComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/task-failure.ts#L7) |
| `TaskFailureState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/task-failure.ts#L5) |
| `TextEditorAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L29) |
| `TextEditorCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L23) |
| `TextEditorComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L39) |
| `TextEditorInput` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L21) |
| `TextEditorResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L22) |
| `TextEditorState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/text-edit.ts#L10) |
| `thinkingLabel` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/model-picker.ts#L44) |
| `ToolGroupComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/tool-disclosures.ts#L11) |
| `ToolMessage` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/tool-disclosures.ts#L10) |
| `UpdateState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/settings.ts#L22) |
| `WelcomeCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/welcome.ts#L11) |
| `WelcomeComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/welcome.ts#L17) |
| `WelcomeResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/welcome.ts#L10) |
| `WelcomeState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/welcome.ts#L9) |
| `WorkspacePickerAssembly` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L19) |
| `WorkspacePickerCallbacks` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L13) |
| `WorkspacePickerComposition` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L23) |
| `WorkspacePickerResult` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L12) |
| `WorkspacePickerState` | [Source](https://github.com/minifish-org/pith-ui/blob/v0.7.1/src/recipes/workspace-picker.ts#L11) |
